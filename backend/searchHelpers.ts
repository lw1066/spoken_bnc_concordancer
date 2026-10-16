interface CorpusToken {
  word: string;
  lemma: string | null;
  pos: string | null;
  position: number;
}

interface PhraseOccurrence {
  startIndex: number;
  endIndexExclusive: number;
}

function isPunctuationToken(token: CorpusToken): boolean {
  return (
    String(token.lemma ?? "").toUpperCase() === "PUNC" ||
    String(token.pos ?? "").startsWith("Y")
  );
}

export function findPhraseOccurrenceAt(
  tokens: CorpusToken[],
  startIndex: number,
  phraseTokens: string[],
): PhraseOccurrence | null {
  let tokenIndex = startIndex;

  for (const phraseToken of phraseTokens) {
    while (
      tokenIndex < tokens.length &&
      isPunctuationToken(tokens[tokenIndex])
    ) {
      tokenIndex++;
    }

    if (
      tokenIndex >= tokens.length ||
      tokens[tokenIndex].word.toLowerCase() !== phraseToken.toLowerCase()
    ) {
      return null;
    }

    tokenIndex++;
  }

  return {
    startIndex,
    endIndexExclusive: tokenIndex,
  };
}

// Keep apostrophes inside words, but treat other punctuation
// as separate tokens. For example: "four? no" ->
// ["four", "?", "no"].
export function tokenizePhrase(query: string): string[] {
  return (
    String(query)
      .trim()
      .match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu) || []
  );
}
