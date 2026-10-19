export interface WordSearchCondition {
  sql: string;
  params: string[];
}

/**
 * Build a SQL condition for a word search.
 *
 * Supported:
 * honestly -> exact match
 * bloody*  -> starts with bloody
 * *ing     -> ends with ing
 * *core*   -> contains core
 */
export function buildWordSearch(query: string): WordSearchCondition | null {
  const value = String(query).trim().toLowerCase();

  if (!value) {
    return null;
  }

  const starCount = (value.match(/\*/g) || []).length;

  // No wildcard = exact word
  if (starCount === 0) {
    return {
      sql: "LOWER(w.word) = ?",
      params: [value],
    };
  }

  // Two wildcards are allowed only at the beginning and end.
  if (starCount === 2) {
    if (value.startsWith("*") && value.endsWith("*")) {
      const middle = value.slice(1, -1);

      if (!middle) {
        return null;
      }

      return {
        sql: "LOWER(w.word) LIKE ?",
        params: [`%${middle}%`],
      };
    }

    return null;
  }

  if (starCount !== 1) {
    return null;
  }

  // *core
  if (value.startsWith("*")) {
    const ending = value.slice(1);

    if (!ending) {
      return null;
    }

    return {
      sql: "LOWER(w.word) LIKE ?",
      params: [`%${ending}`],
    };
  }

  // core*
  if (value.endsWith("*")) {
    const beginning = value.slice(0, -1);

    if (!beginning) {
      return null;
    }

    return {
      sql: "LOWER(w.word) LIKE ?",
      params: [`${beginning}%`],
    };
  }

  return null;
}
