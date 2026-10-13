const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, "bnc_corpus.db"));

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

/**
 * Build context using the actual token position.
 *
 * tokens = all words/tokens in the utterance, ordered by position
 * targetIndex = array index of the matched token
 * window = number of tokens either side
 */
function buildTokenContext(tokens, targetIndex, window) {
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
function getUtteranceWords(utteranceId) {
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
    .all(utteranceId);
}

/**
 * Chunk a large array for SQLite IN (...) queries.
 */
function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Get utterance metadata for a collection of IDs.
 */
function getUtteranceMap(utteranceIds) {
  const utteranceMap = new Map();

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
      .all(...chunk);

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

function buildWordSearch(query) {
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

/**
 * Parse selected vocabulary variants from filter_words.
 */

function getSelectedWords(filterWords) {
  if (!filterWords) {
    return [];
  }

  try {
    const parsed = JSON.parse(String(filterWords));

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (variant) =>
        variant &&
        typeof variant.word === "string" &&
        (typeof variant.pos === "string" || variant.pos === null) &&
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
    } = req.query;

    const window = Math.max(0, parseInt(window_size, 10) || 5);
    console.log("window_size received:", window_size, "parsed:", window);

    const resultLimit = Math.max(1, parseInt(limit, 10) || 20);

    const currentPage = Math.max(1, parseInt(page, 10) || 1);

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

      let uniqueWords = [];

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
          .all(...params)
          .map((row) => ({
            word: row.word,
            pos: row.pos,
            wordClass: row.wordClass,
            count: row.count,
          }));
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
        .get(...resultParams);

      const totalMatches = totalRow.count;

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
        .all(...resultParams, resultLimit, startIndex);

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

      const matchesByUtterance = new Map();

      for (const match of matchingWords) {
        if (!matchesByUtterance.has(match.utterance_id)) {
          matchesByUtterance.set(match.utterance_id, []);
        }

        matchesByUtterance.get(match.utterance_id).push(match);
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

        tokens.forEach((token, index) => {
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

    let uniqueWords = [];

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
        .all(...wordSearch.params)
        .map((row) => ({
          word: row.word,
          pos: row.pos,
          wordClass: row.wordClass,
          count: row.count,
        }));
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
      .get(...resultParams);

    const totalMatches = totalRow.count;

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
      .all(...resultParams, resultLimit, startIndex);

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

    const matchesByUtterance = new Map();

    for (const match of matchingWords) {
      if (!matchesByUtterance.has(match.utterance_id)) {
        matchesByUtterance.set(match.utterance_id, []);
      }

      matchesByUtterance.get(match.utterance_id).push(match);
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

      tokens.forEach((token, index) => {
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
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
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

    const rows = db.prepare(sql).all(...params);

    // -------------------------------------------------------
    // Convert SQL result into frontend-friendly structure
    // -------------------------------------------------------

    const collocations = rows.map((row) => {
      const positions = {};

      for (let position = -leftWindow; position <= rightWindow; position++) {
        if (position === 0) {
          continue;
        }

        positions[String(position)] = row[String(position)] || 0;
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

  const leftWindow = Math.max(0, Math.min(5, parseInt(left, 10) || 0));

  const rightWindow = Math.max(0, Math.min(5, parseInt(right, 10) || 0));

  const maxRows = Math.max(1, parseInt(limit, 10) || 20);

  const pageNum = Math.max(1, parseInt(page, 10) || 1);

  const hasPosition =
    position !== undefined &&
    position !== null &&
    String(position).trim() !== "";

  const relativePosition = hasPosition ? parseInt(position, 10) : null;

  if (!targetWord || !collocateWord) {
    return res.status(400).json({
      error: "target and collocate are required",
    });
  }

  if (
    hasPosition &&
    (Number.isNaN(relativePosition) ||
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

    const parameters = [targetWord, collocateWord];

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
      .all(...parameters);

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
      details: error.message,
    });
  }
});

// ---------------------------------------------------------
// Start server
// ---------------------------------------------------------

app.listen(PORT, () => {
  console.log(`BNC API running at http://localhost:${PORT}`);
});
