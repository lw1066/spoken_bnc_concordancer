import Database from "better-sqlite3";

const db = new Database("./bnc_corpus.db", { readonly: true });

const tags = [
  "RR21",
  "RR22",
  "II21",
  "II22",
  "VMK",
  "CS21",
  "CS22",
  "VM21",
  "VM22",
  "II31",
  "II32",
  "II33",
  "RL21",
  "RL22",
  "PN121",
  "PN122",
  "PPX221",
  "PPX222",
  "JJ21",
  "JJ22",
  "BCL21",
  "NNA",
  "NN121",
  "NN122",
];

try {
  const query = db.prepare(`
    SELECT word, lemma, pos, class, COUNT(*) AS frequency
    FROM words
    WHERE pos = ?
    GROUP BY word, lemma, pos, class
    ORDER BY frequency DESC
    LIMIT 8
  `);

  for (const tag of tags) {
    console.log(`\n--- ${tag} ---`);

    for (const row of query.all(tag)) {
      console.log(
        `${row.word} | lemma: ${row.lemma} | class: ${row.class} | count: ${row.frequency}`,
      );
    }
  }
} finally {
  db.close();
}
