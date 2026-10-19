import Database from "better-sqlite3";

export interface CorpusToken {
  id: number;
  position: number;
  word: string;
  lemma: string | null;
  pos: string | null;
  class: string | null;
  usas: string | null;
}

export interface UtteranceRow {
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

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Get every token in an utterance in its original XML order.
 */
export function getUtteranceWords(
  db: Database.Database,
  utteranceId: number,
): CorpusToken[] {
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
 * Get utterance metadata for a collection of IDs.
 */
export function getUtteranceMap(
  db: Database.Database,
  utteranceIds: number[],
): Map<number, UtteranceRow> {
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
