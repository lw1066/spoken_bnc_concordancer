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

  const [query, setQuery] = useState<string>("");
  const [submittedQuery, setSubmittedQuery] = useState<string>("");

  const [windowSize, setWindowSize] = useState<number>(5);
  const [pendingWindowSize, setPendingWindowSize] = useState<number>(5);
  const [limit, setLimit] = useState<number>(20);
  const [page, setPage] = useState<number>(1);

  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [originalTotalMatches, setOriginalTotalMatches] = useState(0);
  const [uniqueWords, setUniqueWords] = useState<UniqueWord[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [results, setResults] = useState<KwicResult[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [minCollocationFrequency, setMinCollocationFrequency] = useState(5);
  const [collocationLeft, setCollocationLeft] = useState<number>(3);
  const [collocationRight, setCollocationRight] = useState<number>(3);
  const [collocations, setCollocations] = useState<Collocation[]>([]);
  const [collocationsLoading, setCollocationsLoading] =
    useState<boolean>(false);
  const [collocationsError, setCollocationsError] = useState<string>("");
  const [collocationsSearched, setCollocationsSearched] = useState(false);
  const [collocationTotalMatches, setCollocationTotalMatches] = useState(0);

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
          setOriginalTotalMatches(data.total_matches);
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
    setCollocationsSearched(true);
    const collocationQuery =
      selectedWords.length === 1 ? selectedWords[0] : submittedQuery.trim();

    if (!collocationQuery) {
      setCollocationsSearched(false);
      setCollocations([]);
      return;
    }

    setCollocationsLoading(true);
    setCollocationsError("");
    setCollocations([]);
    setSelectedCollocation(null);

    try {
      const params = new URLSearchParams();

      params.set("query", collocationQuery);
      params.set("left", String(collocationLeft));
      params.set("right", String(collocationRight));
      params.set("min_frequency", String(minCollocationFrequency));

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

      const collocationTarget =
        selectedWords.length === 1 ? selectedWords[0] : submittedQuery.trim();

      params.set("target", collocationTarget);
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
      setCollocationTotalMatches(data.total_matches || 0);
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
      setCollocations([]);
      setCollocationsSearched(false);
      setCollocationsError("");
      setCollocationFilter(null);
      setPage(1);
      setError("");
      return;
    }

    setPage(1);
    setSelectedWords([]);
    setCollocations([]);
    setCollocationsSearched(false);
    setCollocationsError("");
    setSelectedCollocation(null);
    setCollocationFilter(null);
    setOriginalTotalMatches(0);
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

  const resetCollocationState = () => {
    setCollocations([]);
    setCollocationsSearched(false);
    setCollocationFilter(null);
    setSelectedCollocation(null);
    setCollocationTotalMatches(0);
    setCollocationsError("");
    setPage(1);
  };

  const toggleWordSelection = (word: string) => {
    resetCollocationState();

    setSelectedWords((current) => {
      if (current.includes(word)) {
        return current.filter((selected) => selected !== word);
      }

      return [...current, word];
    });
  };

  const removeSelectedWord = (word: string) => {
    resetCollocationState();

    setSelectedWords((current) =>
      current.filter((selected) => selected !== word),
    );
  };

  const clearSelectedWords = () => {
    resetCollocationState();
    setSelectedWords([]);
  };

  const updateCollocationLeft = (value: number) => {
    setCollocationLeft(value);
    setCollocationsSearched(false);
    setCollocationFilter(null);
    setSelectedCollocation(null);
    setPage(1);
  };

  const updateCollocationRight = (value: number) => {
    setCollocationRight(value);
    setCollocationsSearched(false);
    setCollocationFilter(null);
    setSelectedCollocation(null);
    setPage(1);
  };

  const updateMinCollocationFrequency = (value: number) => {
    setMinCollocationFrequency(value);
    setCollocationsSearched(false);
    setCollocationFilter(null);
    setSelectedCollocation(null);
    setPage(1);
  };

  const updateCollocationFilter = (
    filter: { word: string; position: number | null } | null,
  ) => {
    setPage(1);
    setCollocationFilter(filter);

    if (!filter) {
      setCollocationTotalMatches(0);
    }
  };

  const displayedTotalMatches = collocationFilter
    ? collocationTotalMatches
    : totalMatches;

  const totalPages = Math.ceil(displayedTotalMatches / limit) || 1;

  const isWildcardSearch =
    submittedSearchType === "word" && submittedQuery.includes("*");

  const canRunCollocations =
    selectedWords.length === 1 ||
    (submittedSearchType === "word" &&
      !isWildcardSearch &&
      submittedQuery.trim() !== "" &&
      selectedWords.length === 0);

  const collocationMessage =
    submittedSearchType === "lemma" && selectedWords.length !== 1
      ? "Choose a single variant to look at collocations."
      : isWildcardSearch && selectedWords.length !== 1
        ? "Choose a single variant to look at collocations."
        : undefined;

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
    originalTotalMatches,
    uniqueWords,
    selectedWords,
    results,
    loading,
    error,
    collocationLeft,
    updateCollocationLeft,
    collocationRight,
    updateCollocationRight,
    collocations,
    collocationsLoading,
    collocationsError,
    collocationsSearched,
    isWildcardSearch,
    canRunCollocations,
    collocationMessage,
    selectedCollocation,
    setSelectedCollocation,
    collocationFilter,
    updateCollocationFilter,
    fetchCollocations,
    handleSearch,
    totalPages,
    displayedTotalMatches,
    toggleWordSelection,
    removeSelectedWord,
    clearSelectedWords,
    minCollocationFrequency,
    updateMinCollocationFrequency,
  };
}
