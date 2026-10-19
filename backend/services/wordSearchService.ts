import type Database from "better-sqlite3";
import {
  buildWordConcordanceResults,
  type ConcordanceToken,
} from "../helpers/concordanceHelpers.ts";
import {
  getUtteranceMap,
  getUtteranceWords,
} from "../helpers/databaseHelpers.ts";
import {
  buildWordSearch,
  type WordSearchCondition,
} from "../helpers/wordSearchHelpers.ts";

interface SelectedWord {
  word: string;
  pos: string | null;
  wordClass: string | null;
}

interface UniqueWord {
  word: string;
  pos: string | null;
  wordClass: string | null;
  count: number;
}

interface CountRow {
  count: number;
}

interface MatchingWordRow {
  utterance_id: number;
  position: number;
  word: string;
  lemma: string | null;
  pos: string | null;
  class: string | null;
  usas: string | null;
}

interface WordSearchOptions {
  query: string;
  page: number;
  limit: number;
  window: number;
  filterWords: unknown;
}

interface WordSearchResult {
  success: true;
  total_matches: number;
  page: number;
  limit: number;
  unique_words: UniqueWord[];
  results: ReturnType<typeof buildWordConcordanceResults>;
}

interface WordSearchError {
  success: false;
  error: string;
}

function getSelectedWords(filterWords: unknown): SelectedWord[] {
  if (!filterWords) {
    return [];
  }

  try {
    const parsed =
      typeof filterWords === "string" ? JSON.parse(filterWords) : filterWords;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === "object",
      )
      .filter(
        (item) => typeof item.word === "string" && item.word.trim().length > 0,
      )
      .map((item) => ({
        word: (item.word as string).trim(),
        pos: typeof item.pos === "string" ? item.pos : null,
        wordClass:
          typeof item.wordClass === "string"
            ? item.wordClass
            : typeof item.class === "string"
              ? item.class
              : null,
      }));
  } catch {
    return [];
  }
}

export function searchWords(
  db: Database.Database,
  options: WordSearchOptions,
): WordSearchResult | WordSearchError {
  const { query, page, limit, window, filterWords } = options;

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return {
      success: false,
      error:
        "Provide 'query' for a word search, or 'lemma', 'pos', 'class', or 'usas' for a linguistic search.",
    };
  }

  const wordSearch = buildWordSearch(cleanQuery);

  console.log("WORD SEARCH CONDITION:", wordSearch);

  console.log(
    "DIRECT LIKE PROBE:",
    db
      .prepare(
        "SELECT LOWER(w.word) AS word FROM words w WHERE LOWER(w.word) LIKE ? ORDER BY word",
      )
      .all("%ly"),
  );

  if (!wordSearch) {
    return {
      success: false,
      error: "Word searches support zero or one '*' wildcard.",
    };
  }

  const selectedWords = getSelectedWords(filterWords);

  console.log("WORD QUERY:", cleanQuery);
  console.log("SELECTED WORDS:", selectedWords);

  let uniqueWords: UniqueWord[] = [];

  if (selectedWords.length === 0) {
    const variantsStart = Date.now();

    uniqueWords = db
      .prepare(
        `
        SELECT
          LOWER(w.word) AS word,
          w.pos AS pos,
          w.class AS wordClass,
          COUNT(*) AS count
        FROM words w
        WHERE ${wordSearch.sql}
        GROUP BY LOWER(w.word), w.pos, w.class
        ORDER BY count DESC, word ASC
        `,
      )
      .all(...wordSearch.params) as UniqueWord[];

    console.log("Vocabulary variants:", Date.now() - variantsStart, "ms");
  }

  let resultConditions: string[];
  let resultParams: (string | null)[];

  if (selectedWords.length > 0) {
    const variantConditions = selectedWords.map(
      () => `(
        LOWER(w.word) = LOWER(?)
        AND (w.pos = ? OR (w.pos IS NULL AND ? IS NULL))
        AND (w.class = ? OR (w.class IS NULL AND ? IS NULL))
      )`,
    );

    resultConditions = [`(${variantConditions.join(" OR ")})`];

    resultParams = selectedWords.flatMap((variant) => [
      variant.word,
      variant.pos,
      variant.pos,
      variant.wordClass,
      variant.wordClass,
    ]);
  } else {
    resultConditions = [wordSearch.sql];
    resultParams = [...wordSearch.params];
  }

  const resultWhere = resultConditions.join(" AND ");

  console.log("RESULT WHERE:", resultWhere);
  console.log("RESULT PARAMS:", resultParams);
  console.log("WORD SEARCH CONDITION:", wordSearch);

  const countStart = Date.now();

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM words w
      WHERE ${resultWhere}
      `,
    )
    .get(...resultParams) as CountRow | undefined;

  const totalMatches = totalRow?.count ?? 0;

  console.log("COUNT query:", Date.now() - countStart, "ms");

  if (totalMatches === 0) {
    return {
      success: true,
      total_matches: 0,
      page,
      limit,
      unique_words: uniqueWords,
      results: [],
    };
  }

  const startIndex = (page - 1) * limit;
  const matchesStart = Date.now();

  const matchingWords = db
    .prepare(
      `
      SELECT
        w.utterance_id,
        w.position,
        w.word,
        w.lemma,
        w.pos,
        w.class,
        w.usas
      FROM words w
      WHERE ${resultWhere}
      ORDER BY w.utterance_id, w.position
      LIMIT ? OFFSET ?
      `,
    )
    .all(...resultParams, limit, startIndex) as MatchingWordRow[];

  console.log("Matching words query:", Date.now() - matchesStart, "ms");

  if (matchingWords.length === 0) {
    return {
      success: true,
      total_matches: totalMatches,
      page,
      limit,
      unique_words: uniqueWords,
      results: [],
    };
  }

  const matchesByUtterance = new Map<number, MatchingWordRow[]>();

  for (const match of matchingWords) {
    const existingMatches = matchesByUtterance.get(match.utterance_id);

    if (existingMatches) {
      existingMatches.push(match);
    } else {
      matchesByUtterance.set(match.utterance_id, [match]);
    }
  }

  const utteranceIds = [...matchesByUtterance.keys()];
  const utteranceMap = getUtteranceMap(db, utteranceIds);

  const contextStart = Date.now();
  const tokenCache = new Map<number, ConcordanceToken[]>();

  for (const utteranceId of matchesByUtterance.keys()) {
    tokenCache.set(utteranceId, getUtteranceWords(db, utteranceId));
  }

  const paginatedResults = buildWordConcordanceResults(
    matchesByUtterance,
    utteranceMap,
    tokenCache,
    window,
  );

  console.log("Context building:", Date.now() - contextStart, "ms");

  return {
    success: true,
    total_matches: totalMatches,
    page,
    limit,
    unique_words: uniqueWords,
    results: paginatedResults,
  };
}
