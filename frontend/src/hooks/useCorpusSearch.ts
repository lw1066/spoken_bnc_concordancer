import { useEffect, useState } from "react";

import type {
  ApiResponse,
  Collocation,
  KwicResult,
  SearchType,
  UniqueWord,
  SelectedVariant,
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
  const [selectedWords, setSelectedWords] = useState<SelectedVariant[]>([]);
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
  const [searchAllVariants, setSearchAllVariants] = useState(false);

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
      } else if (submittedSearchType === "lemma") {
        params.set("lemma", submittedQuery);
      } else if (submittedSearchType === "phrase") {
        params.set("query", submittedQuery);
        params.set("search_type", "phrase");
      }

      // Apply selected variants to word and lemma searches.
      if (selectedWords.length > 0) {
        params.set("filter_words", JSON.stringify(selectedWords));
      }

      params.set("window_size", String(windowSize));
      params.set("limit", String(limit));
      params.set("page", String(page));

      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const url = `${apiBaseUrl}/api/search?${params.toString()}`;
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
    const variant =
      selectedWords.length === 1
        ? selectedWords[0]
        : uniqueWords.length === 1
          ? uniqueWords[0]
          : null;

    const isPhraseSearch = submittedSearchType === "phrase";

    const collocationQuery = isPhraseSearch
      ? submittedQuery.trim()
      : useAllVariants
        ? submittedQuery.trim()
        : (variant?.word ?? "");

    if (!collocationQuery) {
      setCollocationsSearched(false);
      setCollocations([]);
      return;
    }

    setCollocationsSearched(true);
    setCollocationsLoading(true);
    setCollocationsError("");
    setCollocations([]);
    setSelectedCollocation(null);

    try {
      const params = new URLSearchParams();

      params.set("query", collocationQuery);
      params.set("search_type", submittedSearchType);

      if (!useAllVariants && variant) {
        if (variant.pos) {
          params.set("pos", variant.pos);
        }

        if (variant.wordClass) {
          params.set("class", variant.wordClass);
        }
      }
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
        selectedWords.length === 1
          ? selectedWords[0].word
          : submittedQuery.trim();

      params.set("target", collocationTarget);
      params.set("collocate", collocate);
      params.set("left", String(collocationLeft));
      params.set("right", String(collocationRight));
      params.set("limit", String(limit));
      params.set("page", String(requestedPage));
      params.set("display_context_window", String(windowSize));

      // Pass the selected variant's POS and class to the backend.
      if (selectedWords.length === 1) {
        const variant = selectedWords[0];

        if (variant.pos) {
          params.set("pos", variant.pos);
        }

        if (variant.wordClass) {
          params.set("class", variant.wordClass);
        }
      }

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

    const wordCount = trimmedQuery.split(/\s+/).filter(Boolean).length;

    const phraseWordCount =
      trimmedQuery.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length ?? 0;

    if (searchType === "word" && wordCount > 1) {
      setError(
        "Word search accepts only one word. Please enter a single word.",
      );
      return;
    }

    if (searchType === "phrase" && trimmedQuery && phraseWordCount < 2) {
      setError("Phrase search requires 2 or more words.");
      return;
    }

    if (!trimmedQuery) {
      setSubmittedQuery("");
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
    setUniqueWords([]);
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

  const handleSearchAllVariantsChange = (checked: boolean) => {
    setSearchAllVariants(checked);

    if (checked) {
      setSelectedWords([]);
      resetCollocationState();
    }
  };

  const toggleWordSelection = (variant: SelectedVariant) => {
    setSearchAllVariants(false);
    resetCollocationState();

    setSelectedWords((current) => {
      const alreadySelected = current.some(
        (selected) =>
          selected.word === variant.word &&
          selected.pos === variant.pos &&
          selected.wordClass === variant.wordClass,
      );

      if (alreadySelected) {
        return current.filter(
          (selected) =>
            !(
              selected.word === variant.word &&
              selected.pos === variant.pos &&
              selected.wordClass === variant.wordClass
            ),
        );
      }

      return [...current, variant];
    });
  };

  const removeSelectedWord = (variant: SelectedVariant) => {
    resetCollocationState();

    setSelectedWords((current) =>
      current.filter(
        (selected) =>
          !(
            selected.word === variant.word &&
            selected.pos === variant.pos &&
            selected.wordClass === variant.wordClass
          ),
      ),
    );
  };

  const clearSelectedWords = () => {
    resetCollocationState();
    setSelectedWords([]);
  };

  const updateCollocationLeft = (value: number) => {
    setCollocationLeft(value);
    resetCollocationState();
  };

  const updateCollocationRight = (value: number) => {
    setCollocationRight(value);
    resetCollocationState();
  };

  const updateMinCollocationFrequency = (value: number) => {
    setMinCollocationFrequency(value);
    resetCollocationState();
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

  const resetSearch = () => {
    setSearchType("word");
    setSubmittedSearchType("word");
    setQuery("");
    setSubmittedQuery("");
    setPendingWindowSize(5);
    setWindowSize(5);
    setLimit(20);
    setPage(1);

    setTotalMatches(0);
    setOriginalTotalMatches(0);
    setUniqueWords([]);
    setSelectedWords([]);
    setResults([]);
    setError("");

    setSearchAllVariants(false);
    setMinCollocationFrequency(5);
    setCollocationLeft(3);
    setCollocationRight(3);
    resetCollocationState();

    setLoading(false);
    setCollocationsLoading(false);
  };

  const showAllVariantsOption =
    submittedSearchType === "word" && !/[*]/.test(submittedQuery.trim());

  const useAllVariants = searchAllVariants && showAllVariantsOption;

  const displayedTotalMatches = collocationFilter
    ? collocationTotalMatches
    : totalMatches;

  const totalPages = Math.ceil(displayedTotalMatches / limit) || 1;

  const isWildcardSearch =
    submittedSearchType === "word" && submittedQuery.includes("*");

  const canRunCollocations =
    submittedSearchType === "phrase" ||
    useAllVariants ||
    selectedWords.length === 1 ||
    (selectedWords.length === 0 && uniqueWords.length === 1);

  const collocationMessage = useAllVariants
    ? undefined
    : selectedWords.length === 1
      ? undefined
      : uniqueWords.length === 1
        ? undefined
        : isWildcardSearch || submittedSearchType === "lemma"
          ? "Choose a single vocabulary variant to use collocations."
          : "Choose a single vocabulary variant, or tick Use all variants.";

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
    searchAllVariants,
    showAllVariantsOption,
    handleSearchAllVariantsChange,
    resetSearch,
  };
}
