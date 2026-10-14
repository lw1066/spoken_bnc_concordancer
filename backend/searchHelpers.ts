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

type PunctuationMode = "ignore" | "include";

function isPunctuationToken(token: CorpusToken): boolean {
  return (
    String(token.lemma ?? "").toUpperCase() === "PUNC" ||
    String(token.pos ?? "").startsWith("Y")
  );
}

export function findPhraseOccurrences(
  tokens: CorpusToken[],
  phraseTokens: string[],
  punctuationMode: PunctuationMode,
): PhraseOccurrence[] {
  const occurrences: PhraseOccurrence[] = [];

  for (let startIndex = 0; startIndex < tokens.length; startIndex++) {
    let tokenIndex = startIndex;
    let matched = true;

    for (const phraseToken of phraseTokens) {
      if (punctuationMode === "ignore") {
        while (
          tokenIndex < tokens.length &&
          isPunctuationToken(tokens[tokenIndex])
        ) {
          tokenIndex++;
        }
      }

      if (
        tokenIndex >= tokens.length ||
        tokens[tokenIndex].word.toLowerCase() !== phraseToken.toLowerCase()
      ) {
        matched = false;
        break;
      }

      tokenIndex++;
    }

    if (matched) {
      occurrences.push({
        startIndex,
        endIndexExclusive: tokenIndex,
      });
    }
  }

  return occurrences;
}
