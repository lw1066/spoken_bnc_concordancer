import Database from "better-sqlite3";

import {
  buildWordConcordanceResults,
  type ConcordanceToken,
} from "../helpers/concordanceHelpers.ts";

import {
  getUtteranceMap,
  getUtteranceWords,
} from "../helpers/databaseHelpers.ts";

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------

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

interface MatchingWordRow {
  utterance_id: number;
  position: number;
  word: string;
  lemma: string | null;
  pos: string | null;
  class: string | null;
  usas: string | null;
}

interface LemmaSearchOptions {
  lemma: string;
  filterWords: unknown;
  page: number;
  limit: number;
  window: number;
}

interface LemmaSearchResult {
  total_matches: number;
  page: number;
  limit: number;
  unique_words: UniqueWord[];
  results: ReturnType<typeof buildWordConcordanceResults>;
}

// ---------------------------------------------------------
// Parse selected vocabulary variants
// ---------------------------------------------------------

function getSelectedWords(filterWords: unknown): SelectedWord[] {
  if (!filterWords) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(String(filterWords));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (variant): variant is SelectedWord =>
        typeof variant === "object" &&
        variant !== null &&
        "word" in variant &&
        typeof variant.word === "string" &&
        "pos" in variant &&
        (typeof variant.pos === "string" || variant.pos === null) &&
        "wordClass" in variant &&
        (typeof variant.wordClass === "string" || variant.wordClass === null),
    );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------
// Linguistic search
// ---------------------------------------------------------

export function searchLemma(
  db: InstanceType<typeof Database>,
  options: LemmaSearchOptions,
): LemmaSearchResult {
  const { lemma, filterWords, page, limit, window } = options;

  const conditions: string[] = [];
  const params: string[] = [];

  if (lemma.trim()) {
    conditions.push("LOWER(w.lemma) = LOWER(?)");
    params.push(lemma.trim());
  }

  const selectedWords = getSelectedWords(filterWords);

  // -------------------------------------------------------
  // Get available word variants
  // -------------------------------------------------------

  let uniqueWords: UniqueWord[] = [];

  if (selectedWords.length === 0) {
    uniqueWords = db
      .prepare(
        `
        SELECT
          LOWER(w.word) AS word,
          w.pos AS pos,
          w.class AS wordClass,
          COUNT(*) AS count
        FROM words w
        WHERE ${conditions.join(" AND ")}
        GROUP BY LOWER(w.word), w.pos, w.class
        ORDER BY count DESC, word ASC
        `,
      )
      .all(...params) as UniqueWord[];
  }

  // -------------------------------------------------------
  // Build conditions for the matching occurrences
  // -------------------------------------------------------

  let resultConditions: string[];
  let resultParams: (string | null)[];

  if (selectedWords.length > 0) {
    const variantConditions = selectedWords.map(
      () => `
        (
          LOWER(w.word) = LOWER(?)
          AND (
            w.pos = ?
            OR (w.pos IS NULL AND ? IS NULL)
          )
        )
      `,
    );

    resultConditions = [...conditions, `(${variantConditions.join(" OR ")})`];

    const variantParams = selectedWords.flatMap((variant) => [
      variant.word,
      variant.pos,
      variant.pos,
    ]);

    resultParams = [...params, ...variantParams];
  } else {
    resultConditions = [...conditions];
    resultParams = [...params];
  }

  const resultWhere = resultConditions.join(" AND ");

  // -------------------------------------------------------
  // Count matching occurrences
  // -------------------------------------------------------

  const totalRow = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM words w
      WHERE ${resultWhere}
      `,
    )
    .get(...resultParams) as { count: number } | undefined;

  const totalMatches = totalRow?.count ?? 0;

  if (totalMatches === 0) {
    return {
      total_matches: 0,
      page,
      limit,
      unique_words: uniqueWords,
      results: [],
    };
  }

  // -------------------------------------------------------
  // Fetch the current page
  // -------------------------------------------------------

  const startIndex = (page - 1) * limit;

  const matchingWords = db
    .prepare(
      `
      SELECT
        w.utterance_id,
        w.position,
        w.word,
        w.usas
      FROM words w
      WHERE ${resultWhere}
      ORDER BY w.utterance_id, w.position
      LIMIT ? OFFSET ?
      `,
    )
    .all(...resultParams, limit, startIndex) as MatchingWordRow[];

  if (matchingWords.length === 0) {
    return {
      total_matches: totalMatches,
      page,
      limit,
      unique_words: uniqueWords,
      results: [],
    };
  }

  // -------------------------------------------------------
  // Group matching words by utterance
  // -------------------------------------------------------

  const matchesByUtterance = new Map<number, MatchingWordRow[]>();

  for (const match of matchingWords) {
    const existing = matchesByUtterance.get(match.utterance_id);

    if (existing) {
      existing.push(match);
    } else {
      matchesByUtterance.set(match.utterance_id, [match]);
    }
  }

  // -------------------------------------------------------
  // Load utterance metadata and token context
  // -------------------------------------------------------

  const utteranceIds = [...matchesByUtterance.keys()];
  const utteranceMap = getUtteranceMap(db, utteranceIds);

  const tokenCache = new Map<number, ConcordanceToken[]>();

  for (const utteranceId of utteranceIds) {
    tokenCache.set(utteranceId, getUtteranceWords(db, utteranceId));
  }

  // -------------------------------------------------------
  // Build concordance results
  // -------------------------------------------------------

  const results = buildWordConcordanceResults(
    matchesByUtterance,
    utteranceMap,
    tokenCache,
    window,
  );

  return {
    total_matches: totalMatches,
    page,
    limit,
    unique_words: uniqueWords,
    results,
  };
}
