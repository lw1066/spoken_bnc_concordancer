import Database from "better-sqlite3";
import { performance } from "node:perf_hooks";

const databases = [
  { name: "Original", path: "bnc_corpus.db" },
  { name: "Test copy", path: "bnc_corpus_test.db" },
];

const queries = [
  {
    name: "Lemma only",
    sql: "SELECT id FROM words WHERE lemma = ?",
    params: ["help"],
  },
  {
    name: "Lemma + POS",
    sql: "SELECT id FROM words WHERE lemma = ? AND pos = ?",
    params: ["help", "VVD"],
  },
];

const repetitions = 7;
const warmups = 2;

for (const database of databases) {
  const db = new Database(database.path, { readonly: true });

  console.log(`\n${database.name}`);

  for (const query of queries) {
    const statement = db.prepare(query.sql);

    // Warm up SQLite's page cache before measuring.
    for (let i = 0; i < warmups; i++) {
      statement.all(...query.params);
    }

    const times = [];

    for (let i = 0; i < repetitions; i++) {
      const start = performance.now();
      const rows = statement.all(...query.params);
      const elapsed = performance.now() - start;

      times.push(elapsed);

      if (i === 0) {
        console.log(`${query.name}: ${rows.length} rows returned`);
      }
    }

    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];

    console.log(
      `${query.name}: median ${median.toFixed(3)} ms ` +
      `(7 runs: ${times.map((t) => t.toFixed(3)).join(", ")})`
    );
  }

  db.close();
}
