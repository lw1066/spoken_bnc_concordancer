import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import Database from "better-sqlite3";
import request from "supertest";
import { createApp } from "./app.ts";

function createTestDatabase(): Database.Database {
  const db = new Database(":memory:");

  db.exec(`
    CREATE TABLE texts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corpus_id TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      genre TEXT
    );

    CREATE TABLE utterances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text_id INTEGER NOT NULL,
      utterance_number TEXT,
      speaker TEXT,
      trans TEXT,
      who_confidence TEXT,
      search_body TEXT NOT NULL,
      display_body TEXT NOT NULL,
      FOREIGN KEY (text_id) REFERENCES texts(id)
    );

    CREATE TABLE words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      utterance_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      word TEXT NOT NULL,
      lemma TEXT,
      pos TEXT,
      class TEXT,
      usas TEXT,
      FOREIGN KEY (utterance_id) REFERENCES utterances(id)
    );
  `);

  const insertText = db.prepare(`
    INSERT INTO texts (id, corpus_id, filename, genre)
    VALUES (?, ?, ?, ?)
  `);

  const insertUtterance = db.prepare(`
    INSERT INTO utterances (
      id, text_id, utterance_number, speaker, trans,
      who_confidence, search_body, display_body
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertWord = db.prepare(`
    INSERT INTO words (
      utterance_id, position, word, lemma, pos, class, usas
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Text 1: exact-match and context tests.
  insertText.run(1, "TEST001", "TEST001.xml", "conversation");

  insertUtterance.run(
    1,
    1,
    "1",
    "S001",
    "that really helped",
    "high",
    "that really helped",
    "that really helped",
  );

  insertWord.run(1, 1, "that", "that", "DT", null, null);
  insertWord.run(1, 2, "really", "really", "AV0", null, null);
  insertWord.run(1, 3, "helped", "help", "VVD", null, null);

  // Text 2: examples for wildcard and POS tests.
  insertText.run(2, "TEST002", "TEST002.xml", "conversation");

  insertUtterance.run(
    2,
    2,
    "1",
    "S002",
    "realistic slowly football call",
    "high",
    "realistic slowly football call",
    "realistic slowly football call",
  );

  insertWord.run(2, 1, "realistic", "realistic", "AJ0", null, null);
  insertWord.run(2, 2, "slowly", "slowly", "AV0", null, null);
  insertWord.run(2, 3, "football", "football", "NN1", null, null);
  insertWord.run(2, 4, "call", "call", "VVB", null, null);

  // Text 3: an independent phrase-context example.
  insertText.run(3, "TEST003", "TEST003.xml", "conversation");

  insertUtterance.run(
    3,
    3,
    "1",
    "S003",
    "penguins glide past indoors",
    "high",
    "penguins glide past indoors",
    "penguins glide past indoors",
  );

  insertWord.run(3, 1, "penguins", "penguin", "NN2", null, null);
  insertWord.run(3, 2, "glide", "glide", "VVB", null, null);
  insertWord.run(3, 3, "past", "past", "AV0", null, null);
  insertWord.run(3, 4, "indoors", "indoors", "AV0", null, null);

  // Text 4: same spelling with noun and verb POS tags.
  insertText.run(4, "TEST004", "TEST004.xml", "conversation");

  insertUtterance.run(
    4,
    4,
    "1",
    "S004",
    "I run every day, a long run in the morning.",
    "high",
    "I run every day a long run in the morning",
    "I run every day, a long run in the morning.",
  );

  insertWord.run(4, 1, "I", "I", "PNP", null, null);
  insertWord.run(4, 2, "run", "run", "VVB", null, null);
  insertWord.run(4, 3, "every", "every", "AT0", null, null);
  insertWord.run(4, 4, "day", "day", "NN1", null, null);
  insertWord.run(4, 5, "a", "a", "AT0", null, null);
  insertWord.run(4, 6, "long", "long", "AJ0", null, null);
  insertWord.run(4, 7, "run", "run", "NN1", null, null);
  insertWord.run(4, 8, "in", "in", "PRP", null, null);
  insertWord.run(4, 9, "the", "the", "AT0", null, null);
  insertWord.run(4, 10, "morning", "morning", "NN1", null, null);

  // Seed all fixtures before making the database read-only.
  db.pragma("query_only = ON");

  return db;
}

describe("Express API", () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    db = createTestDatabase();
    app = createApp(db);
  });

  afterAll(() => {
    db.close();
  });

  describe("Root endpoint", () => {
    it("returns a success message", async () => {
      const response = await request(app).get("/");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "success",
        message: "Spoken BNC2014 API is running",
      });
    });
  });

  describe("Search validation", () => {
    it("rejects wildcards in phrase searches", async () => {
      const response = await request(app).get("/api/search").query({
        query: "really * good",
        search_type: "phrase",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Wildcards (*) are not allowed in phrase searches.",
      });
    });

    it("rejects word searches containing multiple words", async () => {
      const response = await request(app).get("/api/search").query({
        query: "really good",
        search_type: "word",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: "Word search accepts only one word.",
      });
    });
  });

  describe("Word search", () => {
    it("returns a word match with its surrounding context", async () => {
      const response = await request(app).get("/api/search").query({
        query: "really",
        search_type: "word",
        window_size: 1,
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.total_matches).toBe(1);
      expect(response.body.results).toHaveLength(1);

      expect(response.body.results[0]).toMatchObject({
        corpus_id: "TEST001",
        target: "really",
        left_context: "that",
        right_context: "helped",
        utterance: "that really helped",
        position: 2,
      });
    });

    it("finds a word regardless of query case", async () => {
      const response = await request(app)
        .get("/api/search")
        .query({ query: "REALLY" });

      expect(response.status).toBe(200);
      expect(response.body.total_matches).toBe(1);
      expect(response.body.results[0].target).toBe("really");
    });

    it("returns no results when a word is not found", async () => {
      const response = await request(app)
        .get("/api/search")
        .query({ query: "nonexistent" });

      expect(response.status).toBe(200);
      expect(response.body.total_matches).toBe(0);
      expect(response.body.results).toEqual([]);
    });
  });

  describe("Wildcard search", () => {
    it("finds words beginning with a prefix wildcard", async () => {
      const response = await request(app)
        .get("/api/search")
        .query({ query: "real*", search_type: "word" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.total_matches).toBe(2);

      expect(
        response.body.results.map(
          (result: { target: string }) => result.target,
        ),
      ).toEqual(["really", "realistic"]);
    });

    it("finds words ending with a suffix wildcard", async () => {
      const response = await request(app)
        .get("/api/search")
        .query({ query: "*ly", search_type: "word" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.total_matches).toBe(2);

      expect(
        response.body.results.map(
          (result: { target: string }) => result.target,
        ),
      ).toEqual(["really", "slowly"]);
    });

    it("finds words containing a substring wildcard", async () => {
      const response = await request(app)
        .get("/api/search")
        .query({ query: "*all*", search_type: "word" });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.total_matches).toBe(3);

      expect(
        response.body.results
          .map((result: { target: string }) => result.target)
          .sort(),
      ).toEqual(["call", "football", "really"]);
    });
  });

  describe("Search filters", () => {
    it("finds word forms by lemma", async () => {
      const response = await request(app)
        .get("/api/search")
        .query({ lemma: "help" });

      expect(response.status).toBe(200);
      expect(response.body.total_matches).toBe(1);
      expect(response.body.results[0].target).toBe("helped");
    });

    it("distinguishes the same spelling by selected vocabulary variant", async () => {
      // Search for "run" to find both its noun and verb occurrences.
      const initialResponse = await request(app)
        .get("/api/search")
        .query({ query: "run" });

      expect(initialResponse.status).toBe(200);
      expect(initialResponse.body.total_matches).toBe(2);

      const variants = initialResponse.body.unique_words as {
        word: string;
        pos: string | null;
        wordClass: string | null;
      }[];

      const verbVariant = variants.find(
        (variant) =>
          variant.word.toLowerCase() === "run" && variant.pos === "VVB",
      );

      const nounVariant = variants.find(
        (variant) =>
          variant.word.toLowerCase() === "run" && variant.pos === "NN1",
      );

      expect(verbVariant).toBeDefined();
      expect(nounVariant).toBeDefined();

      // Selecting the verb must exclude the noun occurrence.
      const verbResponse = await request(app)
        .get("/api/search")
        .query({
          query: "run",
          filter_words: JSON.stringify([
            {
              word: verbVariant!.word,
              pos: verbVariant!.pos,
              wordClass: verbVariant!.wordClass,
            },
          ]),
        });

      expect(verbResponse.status).toBe(200);
      expect(verbResponse.body.total_matches).toBe(1);
      expect(
        verbResponse.body.results.map((result: { target: string }) =>
          result.target.toLowerCase(),
        ),
      ).toEqual(["run"]);
      expect(verbResponse.body.results[0].pos).toBe("VVB");

      // Selecting the noun must exclude the verb occurrence.
      const nounResponse = await request(app)
        .get("/api/search")
        .query({
          query: "run",
          filter_words: JSON.stringify([
            {
              word: nounVariant!.word,
              pos: nounVariant!.pos,
              wordClass: nounVariant!.wordClass,
            },
          ]),
        });

      expect(nounResponse.status).toBe(200);
      expect(nounResponse.body.total_matches).toBe(1);
      expect(
        nounResponse.body.results.map((result: { target: string }) =>
          result.target.toLowerCase(),
        ),
      ).toEqual(["run"]);
      expect(nounResponse.body.results[0].pos).toBe("NN1");
    });
  });

  describe("Pagination", () => {
    it("paginates search results without duplicating matches", async () => {
      const page1 = await request(app)
        .get("/api/search")
        .query({ query: "*ly", limit: 1, page: 1 });

      const page2 = await request(app)
        .get("/api/search")
        .query({ query: "*ly", limit: 1, page: 2 });

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      expect(page1.body.total_matches).toBe(2);
      expect(page2.body.total_matches).toBe(2);

      expect(page1.body.results).toHaveLength(1);
      expect(page2.body.results).toHaveLength(1);

      const targets = [
        page1.body.results[0].target,
        page2.body.results[0].target,
      ].sort();

      expect(targets).toEqual(["really", "slowly"]);
    });

    it("returns no results beyond the last page", async () => {
      const response = await request(app)
        .get("/api/search")
        .query({ query: "*ly", limit: 1, page: 3 });

      expect(response.status).toBe(200);
      expect(response.body.total_matches).toBe(2);
      expect(response.body.results).toEqual([]);
    });
  });

  describe("Search context", () => {
    it("handles context at the beginning and end of an utterance", async () => {
      const firstWord = await request(app)
        .get("/api/search")
        .query({ query: "that" });

      expect(firstWord.status).toBe(200);
      expect(firstWord.body.results[0].left_context).toBe("");
      expect(firstWord.body.results[0].right_context).toBe("really helped");

      const lastWord = await request(app)
        .get("/api/search")
        .query({ query: "helped" });

      expect(lastWord.status).toBe(200);
      expect(lastWord.body.results[0].left_context).toBe("that really");
      expect(lastWord.body.results[0].right_context).toBe("");
    });
  });

  describe("Phrase search", () => {
    it("finds a phrase in the correct word order", async () => {
      const response = await request(app).get("/api/search").query({
        query: "that really helped",
        search_type: "phrase",
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.total_matches).toBe(1);

      expect(response.body.results[0]).toMatchObject({
        corpus_id: "TEST001",
        utterance: "that really helped",
      });
    });

    it("does not match a phrase when its words appear in reverse order", async () => {
      const response = await request(app).get("/api/search").query({
        query: "helped really",
        search_type: "phrase",
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.total_matches).toBe(0);
      expect(response.body.results).toEqual([]);
    });

    it("does not match words that are not consecutive", async () => {
      const response = await request(app).get("/api/search").query({
        query: "that helped",
        search_type: "phrase",
      });

      expect(response.status).toBe(200);
      expect(response.body.total_matches).toBe(0);
      expect(response.body.results).toEqual([]);
    });

    it("returns context on both sides of a matched phrase", async () => {
      const response = await request(app).get("/api/search").query({
        query: "glide past",
        search_type: "phrase",
        window_size: 1,
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
      expect(response.body.total_matches).toBe(1);

      expect(response.body.results[0]).toMatchObject({
        corpus_id: "TEST003",
        target: "glide past",
        left_context: "penguins",
        right_context: "indoors",
        utterance: "penguins glide past indoors",
      });
    });
  });
});
