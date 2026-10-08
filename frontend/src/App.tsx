import { useState, useEffect } from "react";

import type {
  ApiResponse,
  Collocation,
  KwicResult,
  SearchType,
  UniqueWord,
} from "./types/corpus";
import SearchControls from "./components/SearchControls";
import VocabularyVariants from "./components/VocabularyVariants";
import ConcordanceTable from "./components/ConcordanceTable";
import Pagination from "./components/Pagination";
import ResultDetailsModal from "./components/ResultDetailsModal";
import CollocationsPanel from "./components/CollocationsPanel";

export default function App() {
  const [searchType, setSearchType] = useState<SearchType>("word");

  const [submittedSearchType, setSubmittedSearchType] =
    useState<SearchType>("word");

  // What is currently typed in the input
  const [query, setQuery] = useState<string>("honestly");
  // The query that has actually been submitted
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
  // Currently selected result for the Details modal
  const [selectedResult, setSelectedResult] = useState<KwicResult | null>(null);
  const [selectedCollocation, setSelectedCollocation] = useState<string | null>(
    null,
  );
  const [collocationFilter, setCollocationFilter] = useState<{
    word: string;
    position: number | null;
  } | null>(null);

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

        // The server only sends unique_words on the initial
        // unfiltered wildcard search. Keep the existing
        // vocabulary buttons when a variant is selected.
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

  // -------------------------------------------------------
  // Reset pagination when display settings change
  // -------------------------------------------------------

  useEffect(() => {
    setPage(1);
  }, [limit]);

  // -------------------------------------------------------
  // Fetch when a submitted search or result filter changes
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // Close Details modal with Escape
  // -------------------------------------------------------

  useEffect(() => {
    if (!selectedResult) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedResult(null);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [selectedResult]);

  // -------------------------------------------------------
  // Toggle a vocabulary variant
  // -------------------------------------------------------

  const toggleWordSelection = (word: string) => {
    setPage(1);

    setSelectedWords((current) => {
      const alreadySelected = current.includes(word);

      if (alreadySelected) {
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

  // -------------------------------------------------------
  // Derived values
  // -------------------------------------------------------

  const totalPages = Math.ceil(totalMatches / limit) || 1;

  const showVocabularyVariants =
    uniqueWords.length > 0 &&
    (submittedSearchType === "lemma" ||
      (submittedSearchType === "word" && submittedQuery.includes("*")));

  const searchPlaceholder =
    searchType === "word"
      ? "e.g. honestly, bloody*, *ing"
      : searchType === "lemma"
        ? "e.g. game, run, be"
        : "e.g. NN1, NN2, VV0, JJ";

  const searchLabel =
    searchType === "word"
      ? "Search Word Token"
      : searchType === "lemma"
        ? "Search Lemma"
        : "Search POS Tag";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b border-slate-200 pb-5">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🗣️</span>
            Spoken BNC2014 Explorer
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            A fast, type-safe linguistic concordance engine using React,
            TypeScript, Express and Tailwind CSS.
          </p>
        </header>

        <SearchControls
          searchType={searchType}
          query={query}
          pendingWindowSize={pendingWindowSize}
          limit={limit}
          loading={loading}
          searchLabel={searchLabel}
          searchPlaceholder={searchPlaceholder}
          onSearchTypeChange={setSearchType}
          onQueryChange={setQuery}
          onWindowSizeChange={setPendingWindowSize}
          onLimitChange={setLimit}
          onSearch={handleSearch}
        />

        {searchType !== "word" && (
          <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg mb-6">
            <p className="text-xs text-blue-800">
              {searchType === "lemma"
                ? "Lemma search finds all word forms sharing the specified lemma."
                : "POS search finds tokens with the specified BNC grammatical tag."}
            </p>
          </div>
        )}

        <VocabularyVariants
          showVocabularyVariants={showVocabularyVariants}
          uniqueWords={uniqueWords}
          selectedWords={selectedWords}
          clearSelectedWords={clearSelectedWords}
          removeSelectedWord={removeSelectedWord}
          toggleWordSelection={toggleWordSelection}
        />

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6 shadow-sm">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* Statistics                                       */}
        {/* ------------------------------------------------ */}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-slate-700">
            Active Dataset Bounds:{" "}
            <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-xs ml-1">
              {loading ? "Calculating..." : `${totalMatches} rows found`}
            </span>
          </h3>
        </div>

        <ConcordanceTable
          results={results}
          loading={loading}
          setSelectedResult={setSelectedResult}
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <CollocationsPanel
          collocations={collocations}
          collocationsLoading={collocationsLoading}
          collocationsError={collocationsError}
          collocationLeft={collocationLeft}
          collocationRight={collocationRight}
          selectedCollocation={selectedCollocation}
          submittedQuery={submittedQuery}
          setCollocationLeft={setCollocationLeft}
          setCollocationRight={setCollocationRight}
          fetchCollocations={fetchCollocations}
          setPage={setPage}
          setCollocationFilter={setCollocationFilter}
          setSelectedCollocation={setSelectedCollocation}
        />

        <ResultDetailsModal
          selectedResult={selectedResult}
          setSelectedResult={setSelectedResult}
        />
      </div>
    </div>
  );
}
