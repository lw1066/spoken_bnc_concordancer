import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "bnc_corpus.db");
const tsPath = path.join(__dirname, "frontend/src/utils/posLabels.ts");

if (!fs.existsSync(dbPath)) {
  throw new Error(`Database not found: ${dbPath}`);
}

if (!fs.existsSync(tsPath)) {
  throw new Error(`POS mapping not found: ${tsPath}`);
}

const source = fs.readFileSync(tsPath, "utf8");

// Extract the keys from the posLabels object.
const mappingMatch = source.match(
  /const\s+posLabels\s*:\s*Record<string,\s*PosLabel>\s*=\s*\{([\s\S]*?)^\};/m,
);

if (!mappingMatch) {
  throw new Error("Could not find the posLabels object in posLabels.ts");
}

const mappedTags = new Set(
  [...mappingMatch[1].matchAll(/^\s{2}([A-Z][A-Z0-9]*)\s*:/gm)].map(
    (match) => match[1],
  ),
);

const db = new Database(dbPath, { readonly: true });

try {
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
    )
    .all()
    .map((row) => row.name);

  const tablesWithPos = [];

  for (const table of tables) {
    // Quote table names safely for SQLite.
    const quotedTable = `"${table.replaceAll('"', '""')}"`;

    const columns = db.prepare(`PRAGMA table_info(${quotedTable})`).all();

    if (columns.some((column) => column.name === "pos")) {
      tablesWithPos.push(table);
    }
  }

  if (tablesWithPos.length === 0) {
    throw new Error("No database table with a 'pos' column was found.");
  }

  for (const table of tablesWithPos) {
    const quotedTable = `"${table.replaceAll('"', '""')}"`;

    const rows = db
      .prepare(
        `
        SELECT pos, COUNT(*) AS frequency
        FROM ${quotedTable}
        WHERE pos IS NOT NULL AND TRIM(pos) != ''
        GROUP BY pos
        ORDER BY frequency DESC
      `,
      )
      .all();

    const databaseTags = new Set(rows.map((row) => row.pos));
    const missing = rows.filter((row) => !mappedTags.has(row.pos));

    console.log(`\nTable: ${table}`);
    console.log(`Distinct POS tags: ${databaseTags.size}`);
    console.log(
      `Mapped tags: ${[...databaseTags].filter((tag) => mappedTags.has(tag)).length}`,
    );
    console.log(`Missing tags: ${missing.length}`);

    if (missing.length > 0) {
      console.log("\nMissing tags (tag | frequency):");

      for (const { pos, frequency } of missing) {
        console.log(
          `${pos.padEnd(8)} | ${frequency.toLocaleString("en-GB").padStart(10)}`,
        );
      }
    } else {
      console.log("All database POS tags have explicit mappings.");
    }
  }
} finally {
  db.close();
}
