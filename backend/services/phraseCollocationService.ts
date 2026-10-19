import Database from "better-sqlite3";
import { findPhraseOccurrenceAt, tokenizePhrase } from "./searchHelpers.ts";
import { getUtteranceWords } from "./databaseHelpers.ts";
import type { CorpusToken } from "./databaseHelpers.ts";

interface PhraseCollocation {
  word: string;
  frequency: number;
  positions: Record<string, number>;
}

type PhraseCollocationResult =
  | { collocations: PhraseCollocation[] }
  | { error: string };

export function searchPhraseCollocations(
  db: Database.Database,
  query: string,
  leftWindow: number,
  rightWindow: number,
  minFrequency: number,
  resultLimit: number,
): PhraseCollocationResult {
  const phraseTokens = tokenizePhrase(query).filter((token) =>
    /[\p{L}\p{N}]/u.test(token),
  );

  if (phraseTokens.length === 0) {
    throw new Error("Enter at least one word in the phrase.");
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

    const occurrence = findPhraseOccurrenceAt(tokens, startIndex, phraseTokens);

    if (!occurrence) continue;

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

      for (let position = -leftWindow; position <= rightWindow; position++) {
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
    .sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word))
    .slice(0, resultLimit);

  return { collocations };
}
