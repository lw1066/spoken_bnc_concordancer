export type SearchType = "word" | "lemma" | "pos";

export type Collocation = {
  word: string;
  frequency: number;
  positions: Record<string, number>;
};

export interface KwicResult {
  id: number;
  text_id: number;
  corpus_id: string;
  filename: string;
  genre: string;
  speaker: string;
  utterance_number: string;
  trans: string | null;
  who_confidence: string | null;
  left_context: string;
  target: string;
  right_context: string;
  utterance: string;
  lemma?: string | null;
  pos?: string | null;
  class?: string | null;
  usas?: string | null;
  position?: number;
}

export interface UniqueWord {
  word: string;
  count: number;
}

export interface ApiResponse {
  status: string;
  total_matches: number;
  page: number;
  limit: number;
  unique_words: UniqueWord[];
  results: KwicResult[];
  error?: string;
}
