export interface ConcordanceToken {
  position: number;
  word: string;
  lemma: string | null;
  pos: string | null;
  class: string | null;
  usas: string | null;
}

export interface ConcordanceUtterance {
  id: number;
  text_id: number;
  utterance_number: number;
  speaker: string | null;
  trans: string | null;
  who_confidence: string | null;
  display_body: string | null;
  corpus_id: string;
  filename: string;
  genre: string | null;
}

export interface MatchingWord {
  utterance_id: number;
  position: number;
  lemma: string | null;
  pos: string | null;
  class: string | null;
  usas: string | null;
}

export interface WordConcordanceResult {
  id: string;
  text_id: number;
  corpus_id: string;
  filename: string;
  genre: string | null;
  speaker: string | null;
  utterance_number: number;
  trans: string | null;
  who_confidence: string | null;
  target: string;
  left_context: string;
  right_context: string;
  utterance: string | null;
  lemma: string | null;
  pos: string | null;
  class: string | null;
  usas: string | null;
  position: number;
}

export function buildTokenContext(
  tokens: ConcordanceToken[],
  targetIndex: number,
  window: number,
) {
  const start = Math.max(0, targetIndex - window);
  const end = Math.min(tokens.length, targetIndex + window + 1);

  return {
    left_context: tokens
      .slice(start, targetIndex)
      .map((token) => token.word)
      .join(" "),
    target: tokens[targetIndex]?.word ?? "",
    right_context: tokens
      .slice(targetIndex + 1, end)
      .map((token) => token.word)
      .join(" "),
  };
}

export function buildWordConcordanceResults(
  matchesByUtterance: Map<number, MatchingWord[]>,
  utteranceMap: Map<number, ConcordanceUtterance>,
  tokenCache: Map<number, ConcordanceToken[]>,
  window: number,
): WordConcordanceResult[] {
  const results: WordConcordanceResult[] = [];

  for (const [utteranceId, matches] of matchesByUtterance) {
    const utterance = utteranceMap.get(utteranceId);
    const tokens = tokenCache.get(utteranceId);

    if (!utterance || !tokens) continue;

    const positionMap = new Map<number, number>();

    tokens.forEach((token, index) => {
      positionMap.set(token.position, index);
    });

    for (const match of matches) {
      const targetIndex = positionMap.get(match.position);

      if (targetIndex === undefined) continue;

      const context = buildTokenContext(tokens, targetIndex, window);

      results.push({
        id: `${utterance.id}-${match.position}`,
        text_id: utterance.text_id,
        corpus_id: utterance.corpus_id,
        filename: utterance.filename,
        genre: utterance.genre,
        speaker: utterance.speaker,
        utterance_number: utterance.utterance_number,
        trans: utterance.trans,
        who_confidence: utterance.who_confidence,
        target: context.target,
        left_context: context.left_context,
        right_context: context.right_context,
        utterance: utterance.display_body,
        lemma: match.lemma,
        pos: match.pos,
        class: match.class,
        usas: match.usas,
        position: match.position,
      });
    }
  }

  return results;
}
