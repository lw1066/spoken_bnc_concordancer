import { useEffect, useState } from "react";

import type {
  ApiResponse,
  Collocation,
  KwicResult,
  SearchType,
  UniqueWord,
} from "../types/corpus";

export default function useCorpusSearch() {
  const [searchType, setSearchType] = useState<SearchType>("word");
  const [submittedSearchType, setSubmittedSearchType] =
    useState<SearchType>("word");

  const [query, setQuery] = useState<string>("honestly");
  const [submittedQuery, setSubmittedQuery] = useState<string>("honestly");

  const [windowSize, setWindowSize] = useState<number>(5);
  const [pendingWindowSize, setPendingWindowSize] = useState<number>(5);
  const [limit, setLimit] = useState<number>(20);
  const [page, setPage] = useState<number>(1);

  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [uniqueWords, setUniqueWords] = useState<UniqueWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [results, setResults] = useState<KwicResult[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [collocationLeft, setCollocationLeft] = useState<number>(3);
  const [collocationRight, setCollocationRight] = useState<number>(3);
  const [collocations, setCollocations] = useState<Collocation[]>([]);
  const [collocationsLoading, setCollocationsLoading] =
    useState<boolean>(false);
  const [collocationsError, setCollocationsError] = useState<string>("");

  const [collocationFilter, setCollocationFilter] = useState<{
    word: string;
    position: number | null;
  } | null>(null);

  const [selectedCollocation, setSelectedCollocation] = useState<string | null>(
    null,
  );

  const fetchCorpusData = async (): Promise<void> => {
    if (!submittedQuery.trim()) {
      setResults([]);
      setTotalMatches(0);
      setUniqueWords([]);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const params = new URLSearchParams();

      if (submittedSearchType === "word") {
        params.set("query", submittedQuery);

        if (selectedWords.length > 0) {
          params.set("filter_words", selectedWords.join(","));
        }
      }

      if (submittedSearchType === "lemma") {
        params.set("lemma", submittedQuery);

        if (selectedWords.length > 0) {
          params.set("filter_words", selectedWords.join(","));
        }
      }

      if (submittedSearchType === "pos") {
        params.set("pos", submittedQuery);
      }

      params.set("window_size", String(windowSize));
      params.set("limit", String(limit));
      params.set("page", String(page));

      const url = `http://localhost:8000/api/search?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.status === "success") {
        setResults(data.results);
        setTotalMatches(data.total_matches);

        if (selectedWords.length === 0) {
          setUniqueWords(data.unique_words);
        }
      } else {
        setError(data.error || "Failed to fetch search results.");
      }
    } catch (err) {
      console.error(err);

      setError(
        "Cannot connect to the Express server. Make sure node server.js is running on port 8000.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCollocations = async () => {
    const trimmedQuery = submittedQuery.trim();

    if (!trimmedQuery) {
      setCollocations([]);
      return;
    }

    setCollocationsLoading(true);
    setCollocationsError("");
    setCollocations([]);
    setSelectedCollocation(null);

    try {
      const params = new URLSearchParams();

      params.set("query", trimmedQuery);
      params.set("left", String(collocationLeft));
      params.set("right", String(collocationRight));

      const response = await fetch(
        `http://localhost:8000/api/collocations?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch collocations.");
      }

      const data = await response.json();

      setCollocations(data.collocations || []);
    } catch (err) {
      console.error("Collocation error:", err);

      setCollocationsError(
        err instanceof Error ? err.message : "Failed to fetch collocations.",
      );
    } finally {
      setCollocationsLoading(false);
    }
  };

  const fetchCollocationConcordance = async (
    collocate: string,
    position: number | null = null,
    requestedPage: number = 1,
  ) => {
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const params = new URLSearchParams();

      params.set("target", submittedQuery);
      params.set("collocate", collocate);
      params.set("left", String(collocationLeft));
      params.set("right", String(collocationRight));
      params.set("limit", String(limit));
      params.set("page", String(requestedPage));

      if (position !== null) {
        params.set("position", String(position));
      }

      const response = await fetch(
        `http://localhost:8000/api/collocations/concordance?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch collocation concordance.");
      }

      const data = await response.json();

      setResults(data.results || []);
      setTotalMatches(data.total_matches || 0);
    } catch (err) {
      console.error("Collocation concordance error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch collocation concordance.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setTotalMatches(0);
      setUniqueWords([]);
      setSelectedWords([]);
      setCollocationFilter(null);
      setPage(1);
      setError("");
      return;
    }

    setPage(1);
    setSelectedWords([]);
    setCollocationFilter(null);
    setSubmittedSearchType(searchType);
    setSubmittedQuery(trimmedQuery);
  };

  useEffect(() => {
    setPage(1);
  }, [limit]);

  useEffect(() => {
    if (collocationFilter) {
      fetchCollocationConcordance(
        collocationFilter.word,
        collocationFilter.position,
        page,
      );

      return;
    }

    fetchCorpusData();
  }, [
    submittedSearchType,
    submittedQuery,
    windowSize,
    limit,
    page,
    selectedWords,
    collocationFilter,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setWindowSize(pendingWindowSize);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [pendingWindowSize]);

  const toggleWordSelection = (word: string) => {
    setPage(1);

    setSelectedWords((current) => {
      if (current.includes(word)) {
        return current.filter((selected) => selected !== word);
      }

      return [...current, word];
    });
  };

  const removeSelectedWord = (word: string) => {
    setPage(1);

    setSelectedWords((current) =>
      current.filter((selected) => selected !== word),
    );
  };

  const clearSelectedWords = () => {
    setPage(1);
    setSelectedWords([]);
  };

  const totalPages = Math.ceil(totalMatches / limit) || 1;

  return {
    searchType,
    setSearchType,
    submittedSearchType,
    query,
    setQuery,
    submittedQuery,
    windowSize,
    pendingWindowSize,
    setPendingWindowSize,
    limit,
    setLimit,
    page,
    setPage,
    totalMatches,
    uniqueWords,
    selectedWords,
    results,
    loading,
    error,
    collocationLeft,
    setCollocationLeft,
    collocationRight,
    setCollocationRight,
    collocations,
    collocationsLoading,
    collocationsError,
    selectedCollocation,
    setSelectedCollocation,
    collocationFilter,
    setCollocationFilter,
    fetchCollocations,
    handleSearch,
    totalPages,
    toggleWordSelection,
    removeSelectedWord,
    clearSelectedWords,
  };
}
