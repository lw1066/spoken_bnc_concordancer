import Database from "better-sqlite3";
import {
  buildTokenContext,
  type ConcordanceToken,
} from "./concordanceHelpers.ts";
import { getUtteranceMap, getUtteranceWords } from "./databaseHelpers.ts";
import type { CorpusToken } from "./databaseHelpers.ts";
import { findPhraseOccurrenceAt, tokenizePhrase } from "./searchHelpers.ts";

interface CollocationMatch {
  utterance_id: number;
  target_position: number;
  collocate_position: number;
  collocate_word: string;
}

interface PhraseContext {
  left_context: string;
  target: string;
  right_context: string;
}

function buildPhraseContext(
  tokens: CorpusToken[],
  startIndex: number,
  phraseLength: number,
  window: number,
): PhraseContext {
  const endIndex = startIndex + phraseLength;

  return {
    left_context: tokens
      .slice(Math.max(0, startIndex - window), startIndex)
      .map((token) => token.word)
      .join(" "),
    target: tokens
      .slice(startIndex, endIndex)
      .map((token) => token.word)
      .join(" "),
    right_context: tokens
      .slice(endIndex, endIndex + window)
      .map((token) => token.word)
      .join(" "),
  };
}

interface CollocationConcordanceOptions {
  target: string;
  collocate: string;
  position: number | null;
  pos?: unknown;
  wordClass?: unknown;
  leftWindow: number;
  rightWindow: number;
  page: number;
  limit: number;
  displayContextWindow: number;
}

interface CollocationConcordanceResult {
  status: "success";
  target: string;
  collocate: string;
  position: number | null;
  left_window: number;
  right_window: number;
  total_matches: number;
  page: number;
  limit: number;
  results: Array<Record<string, unknown>>;
}

export function searchCollocationConcordance(
  db: InstanceType<typeof Database>,
  options: CollocationConcordanceOptions,
): CollocationConcordanceResult {
  const {
    target,
    collocate,
    position,
    pos,
    wordClass,
    leftWindow,
    rightWindow,
    page,
    limit,
    displayContextWindow,
  } = options;

  const conditions = ["LOWER(target.word) = ?", "LOWER(collocate.word) = ?"];
  const parameters: (string | number | null)[] = [target, collocate];

  if (pos) {
    conditions.push("target.pos = ?");
    parameters.push(String(pos));
  }

  if (wordClass) {
    conditions.push("target.class = ?");
    parameters.push(String(wordClass));
  }

  if (position !== null) {
    conditions.push("collocate.position = target.position + ?");
    parameters.push(position);
  } else {
    conditions.push(`
      collocate.position > target.position - ?
      AND collocate.position < target.position + ?
    `);
    parameters.push(leftWindow + 1, rightWindow + 1);
  }

  if (target.includes(" ")) {
    const phraseTokens = tokenizePhrase(target).filter((token) =>
      /[\p{L}\p{N}]/u.test(token),
    );

    if (phraseTokens.length < 2) {
      throw new Error("A phrase target must contain at least two words");
    }

    const candidates = db
      .prepare(
        `
        SELECT utterance_id, position
        FROM words
        WHERE LOWER(word) = ?
        ORDER BY utterance_id, position
      `,
      )
      .iterate(phraseTokens[0].toLowerCase()) as Iterable<{
      utterance_id: number;
      position: number;
    }>;

    const results: Array<Record<string, unknown>> = [];
    let totalMatches = 0;

    for (const candidate of candidates) {
      const tokens = getUtteranceWords(db, candidate.utterance_id);
      const startIndex = tokens.findIndex(
        (token) => token.position === candidate.position,
      );

      if (startIndex === -1) continue;

      const occurrence = findPhraseOccurrenceAt(
        tokens,
        startIndex,
        phraseTokens,
      );

      if (!occurrence) continue;

      const phraseStartIndex = occurrence.startIndex;
      const phraseEndIndex = occurrence.endIndexExclusive;
      const phraseStartPosition = tokens[phraseStartIndex].position;

      const matchedCollocates: Array<{ index: number; distance: number }> = [];

      const isWord = (word: string) => /[\p{L}\p{N}]/u.test(word);

      if (position !== null) {
        const steps = Math.abs(position);
        let distance = 0;

        if (position < 0) {
          let index = phraseStartIndex - 1;

          while (index >= 0 && distance < steps) {
            const tokenIndex = index;
            const token = tokens[tokenIndex];
            index--;

            if (!isWord(token.word) || token.word.startsWith("--")) continue;

            distance++;

            if (distance === steps && token.word.toLowerCase() === collocate) {
              matchedCollocates.push({
                index: tokenIndex,
                distance: -distance,
              });
            }
          }
        } else {
          let index = phraseEndIndex;

          while (index < tokens.length && distance < steps) {
            const tokenIndex = index;
            const token = tokens[tokenIndex];
            index++;

            if (!isWord(token.word) || token.word.startsWith("--")) continue;

            distance++;

            if (distance === steps && token.word.toLowerCase() === collocate) {
              matchedCollocates.push({ index: tokenIndex, distance });
            }
          }
        }
      } else {
        let index = phraseStartIndex - 1;
        let distance = 0;

        while (index >= 0 && distance < leftWindow) {
          const tokenIndex = index;
          const token = tokens[tokenIndex];
          index--;

          if (!isWord(token.word) || token.word.startsWith("--")) continue;

          distance++;

          if (token.word.toLowerCase() === collocate) {
            matchedCollocates.push({ index: tokenIndex, distance: -distance });
          }
        }

        index = phraseEndIndex;
        distance = 0;

        while (index < tokens.length && distance < rightWindow) {
          const tokenIndex = index;
          const token = tokens[tokenIndex];
          index++;

          if (!isWord(token.word) || token.word.startsWith("--")) continue;

          distance++;

          if (token.word.toLowerCase() === collocate) {
            matchedCollocates.push({ index: tokenIndex, distance });
          }
        }
      }

      if (matchedCollocates.length === 0) continue;

      const utteranceMap = getUtteranceMap(db, [candidate.utterance_id]);
      const utterance = utteranceMap.get(candidate.utterance_id);

      if (!utterance) continue;

      const context = buildPhraseContext(
        tokens,
        phraseStartIndex,
        phraseEndIndex - phraseStartIndex,
        displayContextWindow,
      );

      for (const match of matchedCollocates) {
        totalMatches++;

        results.push({
          id: `${utterance.id}-${phraseStartPosition}-${tokens[match.index].position}`,
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
          position: match.distance,
          collocation_target: target,
          collocation_word: collocate,
        });
      }
    }

    const offset = (page - 1) * limit;

    return {
      status: "success",
      target,
      collocate,
      position,
      left_window: leftWindow,
      right_window: rightWindow,
      total_matches: totalMatches,
      page,
      limit,
      results: results.slice(offset, offset + limit),
    };
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
    .all(...parameters) as CollocationMatch[];

  const totalMatches = matchingRows.length;
  const offset = (page - 1) * limit;
  const paginatedRows = matchingRows.slice(offset, offset + limit);
  const results: Array<Record<string, unknown>> = [];

  for (const match of paginatedRows) {
    const utteranceWords = getUtteranceWords(db, match.utterance_id);
    const collocateIndex = utteranceWords.findIndex(
      (word) => word.position === match.collocate_position,
    );

    if (collocateIndex === -1) continue;

    const context = buildTokenContext(
      utteranceWords,
      collocateIndex,
      displayContextWindow,
    );

    const utteranceMap = getUtteranceMap(db, [match.utterance_id]);
    const utterance = utteranceMap.get(match.utterance_id);

    if (!utterance) continue;

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
      collocation_target: target,
      collocation_word: collocate,
    });
  }

  return {
    status: "success",
    target,
    collocate,
    position,
    left_window: leftWindow,
    right_window: rightWindow,
    total_matches: totalMatches,
    page,
    limit,
    results,
  };
}
