import type Database from "better-sqlite3";
import { buildWordSearch } from "../helpers/wordSearchHelpers.ts";

interface CollocationRow {
  word: string;
  frequency: number;
  [position: string]: string | number;
}

interface WordCollocation {
  word: string;
  frequency: number;
  positions: Record<string, number>;
}

type WordCollocationSearchResult =
  | { error: string }
  | { collocations: WordCollocation[] };

export function searchWordCollocations(
  db: Database.Database,
  query: string,
  leftWindow: number,
  rightWindow: number,
  minFrequency: number,
  resultLimit: number,
  pos?: string,
  wordClass?: string,
): WordCollocationSearchResult {
  const wordSearch = buildWordSearch(query);

  if (!wordSearch) {
    return {
      error: "Word searches support zero or one '*' wildcard.",
    };
  }

  const variantConditions: string[] = [];
  const variantParams: string[] = [];

  if (pos) {
    variantConditions.push("w.pos = ?");
    variantParams.push(pos);
  }

  if (wordClass) {
    variantConditions.push("w.class = ?");
    variantParams.push(wordClass);
  }

  const variantWhere =
    variantConditions.length > 0
      ? `AND ${variantConditions.join(" AND ")}`
      : "";

  // Generate one frequency column per relative position, excluding the target at 0.
  const positionExpressions: string[] = [];

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

  return { collocations };
}
