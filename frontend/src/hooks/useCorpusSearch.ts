import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../config/api";
import type {
  ApiResponse,
  Collocation,
  KwicResult,
  SearchType,
  UniqueWord,
  SelectedVariant,
} from "../types/corpus";
export default function useCorpusSearch() {
  const apiBaseUrl = API_BASE_URL;
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
  const updateLimit = (value: number) => {
    setLimit(value);
    setPage(1);
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
        `${apiBaseUrl}/api/collocations?${params.toString()}`,
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
  // Keep request identity separate from response state. A changed request
  // immediately shows loading without synchronously setting state in an effect.
  const concordanceRequest = useMemo(() => {
    if (!submittedQuery.trim()) return null;
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("page", String(page));

    if (collocationFilter) {
      const variant = selectedWords.length === 1 ? selectedWords[0] : null;
      params.set("target", variant?.word ?? submittedQuery.trim());
      params.set("collocate", collocationFilter.word);
      params.set("left", String(collocationLeft));
      params.set("right", String(collocationRight));
      params.set("display_context_window", String(windowSize));
      if (variant?.pos) params.set("pos", variant.pos);
      if (variant?.wordClass) params.set("class", variant.wordClass);
      if (collocationFilter.position !== null) {
        params.set("position", String(collocationFilter.position));
      }
    } else {
      params.set(submittedSearchType === "lemma" ? "lemma" : "query", submittedQuery);
      if (submittedSearchType === "phrase") params.set("search_type", "phrase");
      if (selectedWords.length > 0) {
        params.set("filter_words", JSON.stringify(selectedWords));
      }
      params.set("window_size", String(windowSize));
    }

    const endpoint = collocationFilter ? "collocations/concordance" : "search";
    return {
      url: `${apiBaseUrl}/api/${endpoint}?${params.toString()}`,
      isCollocation: collocationFilter !== null,
      updateVariants: selectedWords.length === 0,
    };
  }, [apiBaseUrl, submittedQuery, submittedSearchType, limit, page,
    windowSize, selectedWords, collocationFilter, collocationLeft, collocationRight]);

  const [completedConcordanceRequest, setCompletedConcordanceRequest] = useState<typeof concordanceRequest>(null);
  const loading = concordanceRequest !== null && concordanceRequest !== completedConcordanceRequest;

  useEffect(() => {
    if (!concordanceRequest) return;
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(concordanceRequest.url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(concordanceRequest.isCollocation
            ? "Failed to fetch collocation concordance."
            : `HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!active) return;

        setError("");
        if (concordanceRequest.isCollocation) {
          setResults(data.results || []);
          setCollocationTotalMatches(data.total_matches || 0);
        } else if (data.status === "success") {
          const corpusData = data as ApiResponse;
          setResults(corpusData.results);
          setTotalMatches(corpusData.total_matches);
          if (concordanceRequest.updateVariants) {
            setOriginalTotalMatches(corpusData.total_matches);
            setUniqueWords(corpusData.unique_words);
          }
        } else {
          setResults([]);
          setError(data.error || "Failed to fetch search results.");
        }
      } catch (err) {
        if (!active) return;
        console.error(err);
        setResults([]);
        setError(concordanceRequest.isCollocation
          ? err instanceof Error ? err.message : "Failed to fetch collocation concordance."
          : "Cannot connect to the Express server. Make sure node server.ts is running on port 8000.");
      } finally {
        if (active) setCompletedConcordanceRequest(concordanceRequest);
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [concordanceRequest]);

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
    setLimit: updateLimit,
    page,
    setPage,
    totalMatches,
    originalTotalMatches,
    uniqueWords,
    selectedWords,
    results: loading ? [] : results,
    loading,
    error: loading ? "" : error,
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
