import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findPhraseOccurrences } from "./searchHelpers.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, "..", "bnc_corpus.db"));

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

interface CorpusToken {
  id: number;
  position: number;
  word: string;
  lemma: string | null;
  pos: string | null;
  class: string | null;
  usas: string | null;
}

interface UtteranceRow {
  id: number;
  text_id: number;
  utterance_number: number;
  speaker: string | null;
  trans: string | null;
  who_confidence: string | null;
  search_body: string | null;
  display_body: string | null;
  corpus_id: string;
  filename: string;
  genre: string | null;
}

interface SelectedWord {
  word: string;
  pos: string | null;
  wordClass: string | null;
}

interface WordSearchCondition {
  sql: string;
  params: string[];
}

interface UniqueWord {
  word: string;
  pos: string | null;
  wordClass: string | null;
  count: number;
}

interface CollocationMatch {
  utterance_id: number;
  target_position: number;
  collocate_position: number;
  collocate_word: string;
}

interface CollocationRow {
  word: string;
  frequency: number;
  [position: string]: string | number;
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

interface PhraseCandidate {
  utterance_id: number;
  position: number;
}

/**
 * Build context using the actual token position.
 *
 * tokens = all words/tokens in the utterance, ordered by position
 * targetIndex = array index of the matched token
 * window = number of tokens either side
 */
function buildTokenContext(
  tokens: CorpusToken[],
  targetIndex: number,
  window: number,
) {
  const start = Math.max(0, targetIndex - window);
  const end = Math.min(tokens.length, targetIndex + window + 1);

  const left = tokens
    .slice(start, targetIndex)
    .map((token) => token.word)
    .join(" ");

  const target = tokens[targetIndex]?.word || "";

  const right = tokens
    .slice(targetIndex + 1, end)
    .map((token) => token.word)
    .join(" ");

  return {
    left_context: left,
    target,
    right_context: right,
  };
}

/**
 * Get every token in an utterance in its original XML order.
 */
function getUtteranceWords(utteranceId: number): CorpusToken[] {
  return db
    .prepare(
      `
      SELECT
        id,
        position,
        word,
        lemma,
        pos,
        class,
        usas
      FROM words
      WHERE utterance_id = ?
      ORDER BY position
      `,
    )
    .all(utteranceId) as CorpusToken[];
}

/**
 * Chunk a large array for SQLite IN (...) queries.
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Get utterance metadata for a collection of IDs.
 */
function getUtteranceMap(utteranceIds: number[]): Map<number, UtteranceRow> {
  const utteranceMap = new Map<number, UtteranceRow>();

  for (const chunk of chunkArray(utteranceIds, 500)) {
    const placeholders = chunk.map(() => "?").join(",");

    const rows = db
      .prepare(
        `
        SELECT
          u.id,
          u.text_id,
          u.utterance_number,
          u.speaker,
          u.trans,
          u.who_confidence,
          u.search_body,
          u.display_body,
          t.corpus_id,
          t.filename,
          t.genre
        FROM utterances u
        JOIN texts t
          ON t.id = u.text_id
        WHERE u.id IN (${placeholders})
        `,
      )
      .all(...chunk) as UtteranceRow[];

    for (const row of rows) {
      utteranceMap.set(row.id, row);
    }
  }

  return utteranceMap;
}

/**
 * Build a SQL condition for a word search.
 *
 * Supported:
 *
 * honestly  -> exact match
 * bloody*   -> starts with bloody
 * *ing      -> ends with ing
 * *core*    -> contains core
 */

function buildWordSearch(query: string): WordSearchCondition | null {
  const value = String(query).trim().toLowerCase();

  if (!value) {
    return null;
  }

  const starCount = (value.match(/\*/g) || []).length;

  // No wildcard = exact word
  if (starCount === 0) {
    return {
      sql: "LOWER(w.word) = ?",
      params: [value],
    };
  }

  // Two wildcards are allowed only when they are
  // at the beginning and end: *core*
  if (starCount === 2) {
    if (value.startsWith("*") && value.endsWith("*")) {
      const middle = value.slice(1, -1);

      if (!middle) {
        return null;
      }

      return {
        sql: "LOWER(w.word) LIKE ?",
        params: [`%${middle}%`],
      };
    }

    return null;
  }

  // Only one wildcard is supported from here
  if (starCount !== 1) {
    return null;
  }

  // *core
  if (value.startsWith("*")) {
    const ending = value.slice(1);

    if (!ending) {
      return null;
    }

    return {
      sql: "LOWER(w.word) LIKE ?",
      params: [`%${ending}`],
    };
  }

  // core*
  if (value.endsWith("*")) {
    const beginning = value.slice(0, -1);

    if (!beginning) {
      return null;
    }

    return {
      sql: "LOWER(w.word) LIKE ?",
      params: [`${beginning}%`],
    };
  }

  return null;
}

function getQueryString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function isPunctuationToken(token: CorpusToken): boolean {
  return (
    String(token.lemma || "").toUpperCase() === "PUNC" ||
    /^Y/.test(String(token.pos || "").toUpperCase())
  );
}

// Keep apostrophes inside words, but treat other punctuation
// as separate tokens. For example: "four? no" ->
// ["four", "?", "no"].
function tokenizePhrase(query: string): string[] {
  return (
    String(query)
      .trim()
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu) || []
  );
}

function buildPhraseContext(
  tokens: CorpusToken[],
  startIndex: number,
  phraseLength: number,
  window: number,
) {
  const endIndex = startIndex + phraseLength;

  return {
    left_context: tokens
      .slice(Math.max(0, startIndex - window), startIndex)
      .map((token) => token.word)
      .join(" "),
    target: tokens
      .slice(startIndex, endIndex)
      .map((token) => token.word)
      .join(" "),
    right_context: tokens
      .slice(endIndex, endIndex + window)
      .map((token) => token.word)
      .join(" "),
  };
}

/**
 * Parse selected vocabulary variants from filter_words.
 */

function getSelectedWords(filterWords: unknown): SelectedWord[] {
  if (!filterWords) {
    return [];
  }

  try {
    const parsed = JSON.parse(String(filterWords));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return (parsed as unknown[]).filter(
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

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Spoken BNC2014 API is running",
  });
});

app.get("/api/search", (req, res) => {
  const searchStart = Date.now();

  try {
    const {
      query = "",
      lemma = "",
      pos = "",
      class: wordClass = "",
      usas = "",
      window_size = "5",
      limit = "20",
      page = "1",
      filter_words = "",
      search_type = "word",
      punctuation = "ignore",
    } = req.query;

    const window = Math.max(
      0,
      parseInt(getQueryString(window_size, "5"), 10) || 5,
    );

    const resultLimit = Math.max(
      1,
      parseInt(getQueryString(limit, "20"), 10) || 20,
    );

    const currentPage = Math.max(
      1,
      parseInt(getQueryString(page, "1"), 10) || 1,
    );

    // -----------------------------------------------------
    // LINGUISTIC SEARCH
    // -----------------------------------------------------
    const hasLinguisticSearch =
      String(lemma).trim() ||
      String(pos).trim() ||
      String(wordClass).trim() ||
      String(usas).trim();

    if (hasLinguisticSearch) {
      const conditions = [];
      const params = [];

      if (String(lemma).trim()) {
        conditions.push("LOWER(w.lemma) = LOWER(?)");
        params.push(String(lemma).trim());
      }

      if (String(pos).trim()) {
        conditions.push("LOWER(w.pos) = LOWER(?)");
        params.push(String(pos).trim());
      }

      if (String(wordClass).trim()) {
        conditions.push("LOWER(w.class) = LOWER(?)");
        params.push(String(wordClass).trim());
      }

      if (String(usas).trim()) {
        conditions.push("LOWER(w.usas) = LOWER(?)");
        params.push(String(usas).trim());
      }

      const selectedWords = getSelectedWords(filter_words);

      // -----------------------------------------------------
      // GET WORD VARIANTS
      // -----------------------------------------------------

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

      // -----------------------------------------------------
      // BUILD CONDITIONS FOR ACTUAL SEARCH
      // -----------------------------------------------------

      let resultConditions;
      let resultParams;

      if (selectedWords.length > 0) {
        const variantConditions = selectedWords.map(() => {
          return `(LOWER(w.word) = LOWER(?) AND (
            w.pos = ? OR (w.pos IS NULL AND ? IS NULL)
          ))`;
        });

        resultConditions = [
          ...conditions,
          `(${variantConditions.join(" OR ")})`,
        ];

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

      // -----------------------------------------------------
      // COUNT MATCHING OCCURRENCES
      // -----------------------------------------------------

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

      if (totalMatches === 0) {
        return res.json({
          status: "success",
          total_matches: 0,
          page: currentPage,
          limit: resultLimit,
          unique_words: uniqueWords,
          results: [],
        });
      }

      // -----------------------------------------------------
      // FETCH ONLY CURRENT PAGE
      // -----------------------------------------------------

      const startIndex = (currentPage - 1) * resultLimit;

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
      ORDER BY
        w.utterance_id,
        w.position
      LIMIT ? OFFSET ?
      `,
        )
        .all(...resultParams, resultLimit, startIndex) as MatchingWordRow[];

      if (matchingWords.length === 0) {
        return res.json({
          status: "success",
          total_matches: totalMatches,
          page: currentPage,
          limit: resultLimit,
          unique_words: uniqueWords,
          results: [],
        });
      }

      // -----------------------------------------------------
      // GROUP CURRENT PAGE BY UTTERANCE
      // -----------------------------------------------------

      const matchesByUtterance = new Map<number, MatchingWordRow[]>();

      for (const match of matchingWords) {
        const existingMatches = matchesByUtterance.get(match.utterance_id);

        if (existingMatches) {
          existingMatches.push(match);
        } else {
          matchesByUtterance.set(match.utterance_id, [match]);
        }
      }

      // -----------------------------------------------------
      // GET UTTERANCE METADATA
      // -----------------------------------------------------

      const utteranceIds = [...matchesByUtterance.keys()];

      const utteranceMap = getUtteranceMap(utteranceIds);

      // -----------------------------------------------------
      // BUILD CONCORDANCE RESULTS
      // -----------------------------------------------------

      const paginatedResults = [];

      const tokenCache = new Map();

      for (const [utteranceId, matches] of matchesByUtterance) {
        const utterance = utteranceMap.get(utteranceId);

        if (!utterance) {
          continue;
        }

        let tokens = tokenCache.get(utteranceId);

        if (!tokens) {
          tokens = getUtteranceWords(utteranceId);
          tokenCache.set(utteranceId, tokens);
        }

        const positionMap = new Map();

        tokens.forEach((token: CorpusToken, index: number) => {
          positionMap.set(token.position, index);
        });

        for (const match of matches) {
          const targetIndex = positionMap.get(match.position);

          if (targetIndex === undefined) {
            continue;
          }

          const context = buildTokenContext(tokens, targetIndex, window);

          paginatedResults.push({
            id: `${utterance.id}-${match.position}`,
            text_id: utterance.text_id,
            corpus_id: utterance.corpus_id,
            filename: utterance.filename,
            genre: utterance.genre,
            speaker: utterance.speaker,
            utterance_number: utterance.utterance_number,
            trans: utterance.trans,
            who_confidence: utterance.who_confidence,
            target: context.target,
            left_context: context.left_context,
            right_context: context.right_context,
            utterance: utterance.display_body,
            lemma: match.lemma,
            pos: match.pos,
            class: match.class,
            usas: match.usas,
            position: match.position,
          });
        }
      }

      // -----------------------------------------------------
      // RESPONSE
      // -----------------------------------------------------

      return res.json({
        status: "success",
        total_matches: totalMatches,
        page: currentPage,
        limit: resultLimit,
        unique_words: uniqueWords,
        results: paginatedResults,
      });
    }

    // -----------------------------------------------------
    // PHRASE SEARCH
    // -----------------------------------------------------

    if (String(search_type) === "phrase") {
      const cleanQuery = String(query).trim();
      const punctuationMode = String(punctuation).toLowerCase();

      if (!cleanQuery) {
        return res.status(400).json({
          error: "Provide a phrase to search for.",
        });
      }

      if (!["include", "ignore"].includes(punctuationMode)) {
        return res.status(400).json({
          error: "punctuation must be 'include' or 'ignore'.",
        });
      }

      const queryTokens = tokenizePhrase(cleanQuery);

      const phraseTokens =
        punctuationMode === "ignore"
          ? queryTokens.filter((token) => !/^[^\p{L}\p{N}]+$/u.test(token))
          : queryTokens;

      if (phraseTokens.length === 0) {
        return res.status(400).json({
          error: "Enter at least one word in the phrase.",
        });
      }

      const firstToken = phraseTokens[0].toLowerCase();
      const offset = (currentPage - 1) * resultLimit;

      let totalMatches = 0;
      const pageMatches = [];

      const candidates = db
        .prepare(
          `
        SELECT utterance_id, position
        FROM words
        WHERE LOWER(word) = ?
        ORDER BY utterance_id, position
      `,
        )
        .iterate(firstToken) as Iterable<PhraseCandidate>;

      let currentUtteranceId = null;
      let tokens: CorpusToken[] = [];

      for (const candidate of candidates) {
        if (candidate.utterance_id !== currentUtteranceId) {
          currentUtteranceId = candidate.utterance_id;
          tokens = getUtteranceWords(currentUtteranceId);
        }

        const startIndex = tokens.findIndex(
          (token) => token.position === candidate.position,
        );

        if (startIndex === -1) continue;

        let tokenIndex = startIndex;
        let matched = true;

        for (let i = 0; i < phraseTokens.length; i++) {
          const expected = phraseTokens[i].toLowerCase();

          if (punctuationMode === "ignore") {
            while (
              tokenIndex < tokens.length &&
              isPunctuationToken(tokens[tokenIndex])
            ) {
              tokenIndex++;
            }
          }

          if (
            tokenIndex >= tokens.length ||
            tokens[tokenIndex].word.toLowerCase() !== expected
          ) {
            matched = false;
            break;
          }

          tokenIndex++;
        }

        if (!matched) continue;

        // In include mode, all tokens must be adjacent.
        // In ignore mode, punctuation between words is skipped.
        // Ordinary intervening words are never skipped.
        const phraseEndIndex = tokenIndex;

        totalMatches++;

        if (totalMatches > offset && pageMatches.length < resultLimit) {
          pageMatches.push({
            utterance_id: currentUtteranceId,
            startIndex,
            endIndex: phraseEndIndex,
            tokens,
          });
        }
      }

      const utteranceIds = [
        ...new Set(pageMatches.map((match) => match.utterance_id)),
      ];
      const utteranceMap = getUtteranceMap(utteranceIds);

      const results = pageMatches.map((match) => {
        const utterance = utteranceMap.get(match.utterance_id);
        const phraseLength = match.endIndex - match.startIndex;
        const context = buildPhraseContext(
          match.tokens,
          match.startIndex,
          phraseLength,
          window,
        );

        return {
          id: `${match.utterance_id}-${match.tokens[match.startIndex].position}-phrase`,
          text_id: utterance?.text_id,
          corpus_id: utterance?.corpus_id,
          filename: utterance?.filename,
          genre: utterance?.genre,
          speaker: utterance?.speaker,
          utterance_number: utterance?.utterance_number,
          trans: utterance?.trans,
          who_confidence: utterance?.who_confidence,
          target: context.target,
          left_context: context.left_context,
          right_context: context.right_context,
          utterance: utterance?.display_body,
          position: match.tokens[match.startIndex].position,
        };
      });

      return res.json({
        status: "success",
        search_type: "phrase",
        punctuation: punctuationMode,
        total_matches: totalMatches,
        page: currentPage,
        limit: resultLimit,
        unique_words: [],
        results,
      });
    }

    // -----------------------------------------------------
    // WORD SEARCH
    // -----------------------------------------------------

    const cleanQuery = String(query).trim();

    if (!cleanQuery) {
      return res.status(400).json({
        error:
          "Provide 'query' for a word search, or 'lemma', 'pos', 'class', or 'usas' for a linguistic search.",
      });
    }

    const wordSearch = buildWordSearch(cleanQuery);

    if (!wordSearch) {
      return res.status(400).json({
        error: "Word searches support zero or one '*' wildcard.",
      });
    }

    const selectedWords = getSelectedWords(filter_words);
    console.log("WORD QUERY:", cleanQuery);
    console.log("SELECTED WORDS:", selectedWords);
    // -----------------------------------------------------
    // Get vocabulary variants.
    //
    // This query ALWAYS uses the original search pattern,
    // never filter_words.
    //
    // This means the variant buttons remain stable when
    // the user selects a word.
    //
    // GROUP BY is done by SQLite rather than loading every
    // matching token into Node.js.
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // Build the conditions for the actual concordance
    // search.
    //
    // If no variants are selected, use the original
    // wildcard condition.
    //
    // If variants are selected, add an exact word filter.
    // SQLite therefore only retrieves matching tokens.
    // -----------------------------------------------------

    let resultConditions;
    let resultParams;

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

    // -----------------------------------------------------
    // Count the actual matching occurrences.
    //
    // This is cheap because SQLite performs the COUNT.
    // No concordance/context data is created yet.
    // -----------------------------------------------------

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
      return res.json({
        status: "success",
        total_matches: 0,
        page: currentPage,
        limit: resultLimit,
        unique_words: uniqueWords,
        results: [],
      });
    }

    // -----------------------------------------------------
    // Fetch ONLY the matching tokens needed for the
    // current page.
    //
    // We don't build contexts for 50,000 matches anymore.
    // SQLite finds the correct page first.
    // -----------------------------------------------------

    const startIndex = (currentPage - 1) * resultLimit;

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
        ORDER BY
          w.utterance_id,
          w.position
        LIMIT ? OFFSET ?
        `,
      )
      .all(...resultParams, resultLimit, startIndex) as MatchingWordRow[];

    console.log("Matching words query:", Date.now() - matchesStart, "ms");

    if (matchingWords.length === 0) {
      return res.json({
        status: "success",
        total_matches: totalMatches,
        page: currentPage,
        limit: resultLimit,
        unique_words: uniqueWords,
        results: [],
      });
    }

    // -----------------------------------------------------
    // Group the current page's matches by utterance.
    //
    // There may be several matching tokens in the same
    // utterance.
    // -----------------------------------------------------

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

    const utteranceMap = getUtteranceMap(utteranceIds);

    // -----------------------------------------------------
    // Build concordance results.
    //
    // Context is only generated for the small number of
    // results on the current page.
    // -----------------------------------------------------

    const contextStart = Date.now();

    const paginatedResults = [];

    const tokenCache = new Map();

    for (const [utteranceId, matches] of matchesByUtterance) {
      const utterance = utteranceMap.get(utteranceId);

      if (!utterance) {
        continue;
      }

      let tokens = tokenCache.get(utteranceId);

      if (!tokens) {
        tokens = getUtteranceWords(utteranceId);
        tokenCache.set(utteranceId, tokens);
      }

      const positionMap = new Map();

      tokens.forEach((token: CorpusToken, index: number) => {
        positionMap.set(token.position, index);
      });

      for (const match of matches) {
        const targetIndex = positionMap.get(match.position);

        if (targetIndex === undefined) {
          continue;
        }

        const context = buildTokenContext(tokens, targetIndex, window);

        paginatedResults.push({
          id: `${utterance.id}-${match.position}`,
          text_id: utterance.text_id,
          corpus_id: utterance.corpus_id,
          filename: utterance.filename,
          genre: utterance.genre,
          speaker: utterance.speaker,
          utterance_number: utterance.utterance_number,
          trans: utterance.trans,
          who_confidence: utterance.who_confidence,
          target: context.target,
          left_context: context.left_context,
          right_context: context.right_context,
          utterance: utterance.display_body,
          lemma: match.lemma,
          pos: match.pos,
          class: match.class,
          usas: match.usas,
          position: match.position,
        });
      }
    }

    console.log("Context building:", Date.now() - contextStart, "ms");
    console.log("TOTAL SEARCH:", Date.now() - searchStart, "ms");
    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return res.json({
      status: "success",
      total_matches: totalMatches,
      page: currentPage,
      limit: resultLimit,
      unique_words: uniqueWords,
      results: paginatedResults,
    });
  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/collocations", (req, res) => {
  const {
    query,
    pos,
    class: wordClass,
    left = 3,
    right = 3,
    min_frequency = 5,
    limit = 100,
  } = req.query;

  console.log("COLLOCATION QUERY:", query);
  console.log("LEFT WINDOW:", left);
  console.log("RIGHT WINDOW:", right);

  try {
    // -------------------------------------------------------
    // Validate query
    // -------------------------------------------------------

    const cleanQuery = String(query || "").trim();

    if (!cleanQuery) {
      return res.status(400).json({
        error: "Provide a query for the target word.",
      });
    }

    // -------------------------------------------------------
    // Validate window sizes
    //
    // Default: 3 words
    // Maximum: 5 words
    // -------------------------------------------------------

    const leftWindow = Number(left);
    const rightWindow = Number(right);

    if (
      !Number.isInteger(leftWindow) ||
      !Number.isInteger(rightWindow) ||
      leftWindow < 0 ||
      rightWindow < 0 ||
      leftWindow > 5 ||
      rightWindow > 5
    ) {
      return res.status(400).json({
        error: "Left and right windows must be whole numbers between 0 and 5.",
      });
    }

    // -------------------------------------------------------
    // Validate result limit
    // -------------------------------------------------------

    const resultLimit = Number(limit);

    if (
      !Number.isInteger(resultLimit) ||
      resultLimit < 1 ||
      resultLimit > 1000
    ) {
      return res.status(400).json({
        error: "Limit must be a whole number between 1 and 1000.",
      });
    }

    // -------------------------------------------------------
    // Validate minimum frequency
    // -------------------------------------------------------

    const minFrequency = Number(min_frequency);

    if (
      !Number.isInteger(minFrequency) ||
      minFrequency < 1 ||
      minFrequency > 1000
    ) {
      return res.status(400).json({
        error: "Minimum frequency must be a whole number between 1 and 1000.",
      });
    }

    // -------------------------------------------------------
    // Build target word search
    //
    // Supports:
    //
    // word
    // word*
    // *word
    // *word*
    // -------------------------------------------------------

    const wordSearch = buildWordSearch(cleanQuery);
    const variantConditions = [];
    const variantParams = [];

    if (pos) {
      variantConditions.push("w.pos = ?");
      variantParams.push(String(pos));
    }

    if (wordClass) {
      variantConditions.push("w.class = ?");
      variantParams.push(String(wordClass));
    }

    const variantWhere =
      variantConditions.length > 0
        ? `AND ${variantConditions.join(" AND ")}`
        : "";

    if (!wordSearch) {
      return res.status(400).json({
        error: "Word searches support zero or one '*' wildcard.",
      });
    }

    // -------------------------------------------------------
    // Build position columns dynamically
    //
    // Example with left=3 and right=3:
    //
    // -3, -2, -1, +1, +2, +3
    //
    // Position 0 is the target itself and is excluded.
    // -------------------------------------------------------

    const positionExpressions = [];

    for (let position = -leftWindow; position <= rightWindow; position++) {
      if (position === 0) {
        continue;
      }

      positionExpressions.push(`
        SUM(
          CASE
            WHEN collocate.position = w.position + ${position}
            THEN 1
            ELSE 0
          END
        ) AS "${position}"
      `);
    }

    const positionSelect =
      positionExpressions.length > 0
        ? `,\n${positionExpressions.join(",\n")}`
        : "";

    // -------------------------------------------------------
    // Collocation query
    //
    // w          = target word
    // collocate  = nearby word
    //
    // Both must belong to the same utterance.
    // -------------------------------------------------------

    const sql = `
      SELECT
        LOWER(collocate.word) AS word,
        COUNT(*) AS frequency
        ${positionSelect}

      FROM words w

      JOIN words collocate
        ON collocate.utterance_id = w.utterance_id

        AND collocate.position >= w.position - ?
        AND collocate.position <= w.position + ?

        AND collocate.position != w.position

      WHERE ${wordSearch.sql}
        ${variantWhere}

        -- Remove punctuation-only tokens
        AND collocate.word GLOB '*[A-Za-z0-9]*'

        -- Remove BNC annotation tokens
        AND collocate.word NOT LIKE '--%'

      GROUP BY LOWER(collocate.word)

      HAVING COUNT(*) >= ?

      ORDER BY
        frequency DESC,
        word ASC

      LIMIT ?
    `;

    const params = [
      leftWindow,
      rightWindow,
      ...wordSearch.params,
      ...variantParams,
      minFrequency,
      resultLimit,
    ];

    // -------------------------------------------------------
    // Execute query
    // -------------------------------------------------------

    const rows = db.prepare(sql).all(...params) as CollocationRow[];

    // -------------------------------------------------------
    // Convert SQL result into frontend-friendly structure
    // -------------------------------------------------------

    const collocations = rows.map((row) => {
      const positions: Record<string, number> = {};

      for (let position = -leftWindow; position <= rightWindow; position++) {
        if (position === 0) {
          continue;
        }

        positions[String(position)] = Number(row[String(position)] ?? 0);
      }

      return {
        word: row.word,
        frequency: row.frequency,
        positions,
      };
    });

    console.log("COLLOCATION RESULTS:", collocations.length);

    // -------------------------------------------------------
    // Response
    // -------------------------------------------------------

    return res.json({
      query: cleanQuery,
      left_window: leftWindow,
      right_window: rightWindow,
      min_frequency: minFrequency,
      collocations,
    });
  } catch (error) {
    console.error("Collocation search error:", error);

    return res.status(500).json({
      error: "Collocation search failed.",
    });
  }
});
// ---------------------------------------------------------
// COLLOCATION CONCORDANCE
// ---------------------------------------------------------

app.get("/api/collocations/concordance", (req, res) => {
  const {
    target,
    collocate,
    position,
    pos,
    class: wordClass,
    left = 5,
    right = 5,
    limit = 20,
    page = 1,
  } = req.query;

  const targetWord = String(target || "")
    .trim()
    .toLowerCase();
  const collocateWord = String(collocate || "")
    .trim()
    .toLowerCase();

  const leftWindow = Math.max(
    0,
    Math.min(5, parseInt(getQueryString(left, "3"), 10) || 0),
  );

  const rightWindow = Math.max(
    0,
    Math.min(5, parseInt(getQueryString(right, "3"), 10) || 0),
  );

  const maxRows = Math.max(1, parseInt(getQueryString(limit, "20"), 10) || 20);

  const pageNum = Math.max(1, parseInt(getQueryString(page, "1"), 10) || 1);

  const hasPosition =
    position !== undefined &&
    position !== null &&
    String(position).trim() !== "";

  const positionValue = getQueryString(position, "");
  const relativePosition =
    hasPosition && positionValue !== "" ? parseInt(positionValue, 10) : null;

  if (!targetWord || !collocateWord) {
    return res.status(400).json({
      error: "target and collocate are required",
    });
  }
  if (
    hasPosition &&
    (relativePosition === null ||
      Number.isNaN(relativePosition) ||
      relativePosition === 0 ||
      relativePosition < -5 ||
      relativePosition > 5)
  ) {
    return res.status(400).json({
      error: "position must be between -5 and -1 or 1 and 5",
    });
  }

  try {
    /*
     * Find every occurrence where the collocate occurs
     * within the requested window around the target.
     *
     * If position is supplied, we only return that exact
     * relative position.
     */

    const conditions = ["LOWER(target.word) = ?", "LOWER(collocate.word) = ?"];

    const parameters: (string | number | null)[] = [targetWord, collocateWord];

    // Restrict target occurrences to the selected variant.
    if (pos) {
      conditions.push("target.pos = ?");
      parameters.push(String(pos));
    }

    if (wordClass) {
      conditions.push("target.class = ?");
      parameters.push(String(wordClass));
    }

    if (hasPosition) {
      conditions.push("collocate.position = target.position + ?");

      parameters.push(relativePosition);
    } else {
      conditions.push(`
        collocate.position > target.position - ?
        AND collocate.position < target.position + ?
      `);

      parameters.push(leftWindow + 1);
      parameters.push(rightWindow + 1);
    }

    const matchingRows = db
      .prepare(
        `
        SELECT
          target.utterance_id,
          target.position AS target_position,
          collocate.position AS collocate_position,
          collocate.word AS collocate_word
        FROM words target
        JOIN words collocate
          ON collocate.utterance_id = target.utterance_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY target.utterance_id, target.position
      `,
      )
      .all(...parameters) as CollocationMatch[];

    /*
     * Each row represents one occurrence of the collocate
     * associated with one occurrence of the target.
     */

    const totalMatches = matchingRows.length;

    const offset = (pageNum - 1) * maxRows;

    const paginatedRows = matchingRows.slice(offset, offset + maxRows);

    const results = [];

    for (const match of paginatedRows) {
      const utteranceWords = getUtteranceWords(match.utterance_id);

      const collocateIndex = utteranceWords.findIndex(
        (word) => word.position === match.collocate_position,
      );

      if (collocateIndex === -1) {
        continue;
      }

      const context = buildTokenContext(
        utteranceWords,
        collocateIndex,
        Math.max(leftWindow, rightWindow),
      );

      const utteranceMap = getUtteranceMap([match.utterance_id]);

      const utterance = utteranceMap.get(match.utterance_id);

      if (!utterance) {
        continue;
      }

      results.push({
        id: `${utterance.id}-${match.target_position}-${match.collocate_position}`,
        text_id: utterance.text_id,
        corpus_id: utterance.corpus_id,
        filename: utterance.filename,
        genre: utterance.genre,
        speaker: utterance.speaker,
        utterance_number: utterance.utterance_number,
        trans: utterance.trans,
        who_confidence: utterance.who_confidence,

        left_context: context.left_context,
        target: context.target,
        right_context: context.right_context,

        utterance: utterance.display_body,

        position: match.collocate_position - match.target_position,

        collocation_target: targetWord,
        collocation_word: collocateWord,
      });
    }

    return res.json({
      status: "success",
      target: targetWord,
      collocate: collocateWord,
      position: hasPosition ? relativePosition : null,
      left_window: leftWindow,
      right_window: rightWindow,
      total_matches: totalMatches,
      page: pageNum,
      limit: maxRows,
      results,
    });
  } catch (error) {
    console.error("Collocation concordance error:", error);

    return res.status(500).json({
      error: "Internal collocation concordance failure",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// ---------------------------------------------------------
// Start server
// ---------------------------------------------------------

app.listen(PORT, () => {
  console.log(`BNC API running at http://localhost:${PORT}`);
});
