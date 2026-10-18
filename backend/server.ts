import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tokenizePhrase } from "./searchHelpers.ts";
import { searchPhrase } from "./phraseSearchService.ts";
import { searchWords } from "./wordSearchService.ts";
import { searchCollocationConcordance } from "./collocationConcordanceService.ts";
import { searchLinguistic } from "./linguisticSearchService.ts";
import { buildWordSearch } from "./wordSearchHelpers.ts";
import { searchPhraseCollocations } from "./phraseCollocationService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, "..", "bnc_corpus.db"));

interface CollocationRow {
  word: string;
  frequency: number;
  [position: string]: string | number;
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

    // Use linguistic search when any linguistic filter is supplied.
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

  try {
    const cleanQuery = String(query || "").trim();

    if (!cleanQuery) {
      return res.status(400).json({
        error: "Provide a query for the target word.",
      });
    }

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

    if (String(req.query.search_type) === "phrase") {
      const outcome = searchPhraseCollocations(
        db,
        cleanQuery,
        leftWindow,
        rightWindow,
        minFrequency,
        resultLimit,
      );

      if ("error" in outcome) {
        return res.status(400).json({
          error: outcome.error,
        });
      }

      return res.json({
        query: cleanQuery,
        left_window: leftWindow,
        right_window: rightWindow,
        min_frequency: minFrequency,
        collocations: outcome.collocations,
      });
    }

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

    // Generate one frequency column per relative position, excluding the target at 0.
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

    const rows = db.prepare(sql).all(...params) as CollocationRow[];

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

  // Phrase targets must contain at least two words.
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

app.listen(PORT, () => {
  console.log(`BNC API running at http://localhost:${PORT}`);
});
