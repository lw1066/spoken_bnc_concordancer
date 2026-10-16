import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findPhraseOccurrenceAt, tokenizePhrase } from "./searchHelpers.ts";
import { getUtteranceWords } from "./databaseHelpers.ts";
import type { CorpusToken } from "./databaseHelpers.ts";
import { searchPhrase } from "./phraseSearchService.ts";
import { searchWords } from "./wordSearchService.ts";
import { searchCollocationConcordance } from "./collocationConcordanceService.ts";
import { searchLinguistic } from "./linguisticSearchService.ts";

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
interface WordSearchCondition {
  sql: string;
  params: string[];
}

interface CollocationRow {
  word: string;
  frequency: number;
  [position: string]: string | number;
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
      const outcome = searchLinguistic(db, {
        lemma: String(lemma).trim(),
        pos: String(pos).trim(),
        wordClass: String(wordClass).trim(),
        usas: String(usas).trim(),
        filterWords: filter_words,
        page: currentPage,
        limit: resultLimit,
        window,
      });

      return res.json({
        status: "success",
        ...outcome,
      });
    }

    if (String(search_type) === "phrase") {
      const outcome = searchPhrase(
        db,
        String(query),
        currentPage,
        resultLimit,
        window,
      );

      if (!outcome.success) {
        return res.status(400).json({
          error: outcome.error,
        });
      }

      return res.json({
        status: "success",
        search_type: "phrase",
        total_matches: outcome.total_matches,
        page: outcome.page,
        limit: outcome.limit,
        unique_words: [],
        results: outcome.results,
      });
    }

    const outcome = searchWords(db, {
      query: String(query ?? ""),
      page: currentPage,
      limit: resultLimit,
      window,
      filterWords: filter_words,
    });

    if (!outcome.success) {
      return res.status(400).json({
        error: outcome.error,
      });
    }

    return res.json({
      status: "success",
      total_matches: outcome.total_matches,
      page: outcome.page,
      limit: outcome.limit,
      unique_words: outcome.unique_words,
      results: outcome.results,
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
    // Phrase collocations
    //
    // Punctuation is always ignored for collocation searches.
    // The left window is measured from the first phrase token;
    // the right window is measured from the last phrase token.
    // -------------------------------------------------------

    if (String(req.query.search_type) === "phrase") {
      const phraseTokens = tokenizePhrase(cleanQuery).filter((token) =>
        /[\p{L}\p{N}]/u.test(token),
      );

      if (phraseTokens.length === 0) {
        return res.status(400).json({
          error: "Enter at least one word in the phrase.",
        });
      }

      const firstToken = phraseTokens[0].toLowerCase();

      const candidates = db
        .prepare(
          `
      SELECT utterance_id, position
      FROM words
      WHERE LOWER(word) = ?
      ORDER BY utterance_id, position
      `,
        )
        .iterate(firstToken) as Iterable<{
        utterance_id: number;
        position: number;
      }>;

      const collocateCounts = new Map<
        string,
        { frequency: number; positions: Record<string, number> }
      >();

      let currentUtteranceId: number | null = null;
      let tokens: CorpusToken[] = [];

      for (const candidate of candidates) {
        if (candidate.utterance_id !== currentUtteranceId) {
          currentUtteranceId = candidate.utterance_id;
          tokens = getUtteranceWords(db, currentUtteranceId);
        }

        const startIndex = tokens.findIndex(
          (token) => token.position === candidate.position,
        );

        if (startIndex === -1) continue;

        const occurrence = findPhraseOccurrenceAt(
          tokens,
          startIndex,
          phraseTokens,
        );

        if (!occurrence) continue;

        const phraseStartPosition = tokens[occurrence.startIndex].position;
        const phraseEndPosition =
          tokens[occurrence.endIndexExclusive - 1].position;

        const phraseStartIndex = occurrence.startIndex;
        const phraseEndIndex = occurrence.endIndexExclusive - 1;

        // Count actual words to the left, skipping punctuation and annotations.
        let index = phraseStartIndex - 1;
        let distance = 0;

        while (index >= 0 && distance < leftWindow) {
          const token = tokens[index];
          index--;

          if (!/[\p{L}\p{N}]/u.test(token.word)) continue;
          if (token.word.startsWith("--")) continue;

          distance++;
          const word = token.word.toLowerCase();

          const existing = collocateCounts.get(word) ?? {
            frequency: 0,
            positions: {},
          };

          existing.frequency++;
          existing.positions[String(-distance)] =
            (existing.positions[String(-distance)] ?? 0) + 1;

          collocateCounts.set(word, existing);
        }

        // Count actual words to the right, skipping punctuation and annotations.
        index = phraseEndIndex + 1;
        distance = 0;

        while (index < tokens.length && distance < rightWindow) {
          const token = tokens[index];
          index++;

          if (!/[\p{L}\p{N}]/u.test(token.word)) continue;
          if (token.word.startsWith("--")) continue;

          distance++;
          const word = token.word.toLowerCase();

          const existing = collocateCounts.get(word) ?? {
            frequency: 0,
            positions: {},
          };

          existing.frequency++;
          existing.positions[String(distance)] =
            (existing.positions[String(distance)] ?? 0) + 1;

          collocateCounts.set(word, existing);
        }
      }

      const collocations = [...collocateCounts.entries()]
        .map(([word, data]) => {
          const positions: Record<string, number> = {};

          for (
            let position = -leftWindow;
            position <= rightWindow;
            position++
          ) {
            if (position === 0) continue;

            positions[String(position)] = data.positions[String(position)] ?? 0;
          }

          return {
            word,
            frequency: data.frequency,
            positions,
          };
        })
        .filter((item) => item.frequency >= minFrequency)
        .sort(
          (a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word),
        )
        .slice(0, resultLimit);

      return res.json({
        query: cleanQuery,
        left_window: leftWindow,
        right_window: rightWindow,
        min_frequency: minFrequency,
        collocations,
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
  const target = String(req.query.target ?? "")
    .trim()
    .toLowerCase();
  const collocate = String(req.query.collocate ?? "")
    .trim()
    .toLowerCase();

  const positionParam = req.query.position;
  const pos = req.query.pos;
  const wordClass = req.query.class;

  const leftWindow = Math.min(5, Math.max(0, Number(req.query.left ?? 5)));

  const rightWindow = Math.min(5, Math.max(0, Number(req.query.right ?? 5)));

  const limit = Math.max(1, Number(req.query.limit ?? 20));
  const page = Math.max(1, Number(req.query.page ?? 1));

  const displayContextWindow = Math.min(
    20,
    Math.max(1, Number(req.query.display_context_window ?? 5)),
  );

  if (!target || !collocate) {
    return res.status(400).json({
      error: "Both target and collocate are required",
    });
  }

  let relativePosition: number | null = null;

  if (positionParam !== undefined && positionParam !== "") {
    relativePosition = Number(positionParam);

    if (
      !Number.isInteger(relativePosition) ||
      relativePosition < -5 ||
      relativePosition > 5 ||
      relativePosition === 0
    ) {
      return res.status(400).json({
        error: "Position must be an integer from -5 to -1 or 1 to 5",
      });
    }
  }

  // Preserve the original phrase-target validation and its HTTP 400 response.
  if (target.includes(" ")) {
    const phraseTokens = tokenizePhrase(target).filter((token) =>
      /[\p{L}\p{N}]/u.test(token),
    );

    if (phraseTokens.length < 2) {
      return res.status(400).json({
        error: "A phrase target must contain at least two words",
      });
    }
  }

  try {
    const result = searchCollocationConcordance(db, {
      target,
      collocate,
      position: relativePosition,
      pos,
      wordClass,
      leftWindow,
      rightWindow,
      page,
      limit,
      displayContextWindow,
    });

    return res.json(result);
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
