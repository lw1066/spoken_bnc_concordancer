import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = process.env.CORPUS_DB ?? "bnc_corpus.db";
const db = new Database(path.join(__dirname, "..", dbFile));

const app = createApp(db);
const PORT = 8000;

app.listen(PORT, () => {
  console.log(`BNC API running at http://localhost:${PORT}`);
});
