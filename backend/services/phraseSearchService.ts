import type Database from "better-sqlite3";
import { findPhraseOccurrenceAt } from "../helpers/searchHelpers.ts";
import {
  getUtteranceMap,
  getUtteranceWords,
} from "../helpers/databaseHelpers.ts";
import type { CorpusToken, UtteranceRow } from "../helpers/databaseHelpers.ts";

interface PhraseCandidate {
  utterance_id: number;
  position: number;
}

interface PhraseContext {
  left_context: string;
  target: string;
  right_context: string;
}

interface PhraseMatch {
  utterance_id: number;
  startIndex: number;
  endIndex: number;
  tokens: CorpusToken[];
}

interface PhraseResult {
  id: string;
  text_id: number | undefined;
  corpus_id: string | undefined;
  filename: string | undefined;
  genre: string | null | undefined;
  speaker: string | null | undefined;
  utterance_number: number | undefined;
  trans: string | null | undefined;
  who_confidence: string | null | undefined;
  target: string;
  left_context: string;
  right_context: string;
  utterance: string | null | undefined;
  position: number;
}

interface PhraseSearchSuccess {
  success: true;
  total_matches: number;
  page: number;
  limit: number;
  results: PhraseResult[];
}

interface PhraseSearchError {
  success: false;
  error: string;
}

type PhraseSearchOutcome = PhraseSearchSuccess | PhraseSearchError;

function tokenizePhrase(query: string): string[] {
  return (
    String(query)
      .trim()
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu) || []
  );
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

export function searchPhrase(
  db: Database.Database,
  query: string,
  page: number,
  limit: number,
  window: number,
): PhraseSearchOutcome {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return {
      success: false,
      error: "Provide a phrase to search for.",
    };
  }

  const queryTokens = tokenizePhrase(cleanQuery);
  const phraseTokens = queryTokens.filter((token) =>
    /[\p{L}\p{N}]/u.test(token),
  );

  if (phraseTokens.length === 0) {
    return {
      success: false,
      error: "Enter at least one word in the phrase.",
    };
  }

  const firstToken = phraseTokens[0].toLowerCase();
  const offset = (page - 1) * limit;

  let totalMatches = 0;
  const pageMatches: PhraseMatch[] = [];

  const candidates = db
    .prepare(
      `
      SELECT utterance_id, position
      FROM words
      WHERE LOWER(word) = ?
      ORDER BY utterance_id, position
      `,
    )
    .iterate(firstToken) as Iterable<PhraseCandidate>;

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

    const phraseEndIndex = occurrence.endIndexExclusive;
    totalMatches++;

    if (totalMatches > offset && pageMatches.length < limit) {
      pageMatches.push({
        utterance_id: currentUtteranceId,
        startIndex,
        endIndex: phraseEndIndex,
        tokens,
      });
    }
  }

  const utteranceIds = [
    ...new Set(pageMatches.map((match) => match.utterance_id)),
  ];

  const utteranceMap = getUtteranceMap(db, utteranceIds);

  const results: PhraseResult[] = pageMatches.map((match) => {
    const utterance: UtteranceRow | undefined = utteranceMap.get(
      match.utterance_id,
    );

    const phraseLength = match.endIndex - match.startIndex;
    const context = buildPhraseContext(
      match.tokens,
      match.startIndex,
      phraseLength,
      window,
    );

    return {
      id: `${match.utterance_id}-${match.tokens[match.startIndex].position}-phrase`,
      text_id: utterance?.text_id,
      corpus_id: utterance?.corpus_id,
      filename: utterance?.filename,
      genre: utterance?.genre,
      speaker: utterance?.speaker,
      utterance_number: utterance?.utterance_number,
      trans: utterance?.trans,
      who_confidence: utterance?.who_confidence,
      target: context.target,
      left_context: context.left_context,
      right_context: context.right_context,
      utterance: utterance?.display_body,
      position: match.tokens[match.startIndex].position,
    };
  });

  return {
    success: true,
    total_matches: totalMatches,
    page,
    limit,
    results,
  };
}
