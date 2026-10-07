import React, { useState, useEffect } from "react";

type SearchType = "word" | "lemma" | "pos";

type Collocation = {
  word: string;
  frequency: number;
  left_frequency: number;
  right_frequency: number;
};

interface KwicResult {
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

interface UniqueWord {
  word: string;
  count: number;
}

interface ApiResponse {
  status: string;
  total_matches: number;
  page: number;
  limit: number;
  unique_words: UniqueWord[];
  results: KwicResult[];
  error?: string;
}

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

  // -------------------------------------------------------
  // Fetch corpus data
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // Submit a new search
  // -------------------------------------------------------

  const handleSearch = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setTotalMatches(0);
      setUniqueWords([]);
      setSelectedWords([]);
      setPage(1);
      setError("");
      return;
    }

    setPage(1);
    setSelectedWords([]);
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
    fetchCorpusData();
  }, [
    submittedSearchType,
    submittedQuery,
    windowSize,
    limit,
    page,
    selectedWords,
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

  // -------------------------------------------------------
  // Remove a selected word
  // -------------------------------------------------------

  const removeSelectedWord = (word: string) => {
    setPage(1);

    setSelectedWords((current) =>
      current.filter((selected) => selected !== word),
    );
  };

  // -------------------------------------------------------
  // Clear all selected variants
  // -------------------------------------------------------

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
        {/* ------------------------------------------------ */}
        {/* Header                                           */}
        {/* ------------------------------------------------ */}

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

        {/* ------------------------------------------------ */}
        {/* Search controls                                  */}
        {/* ------------------------------------------------ */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          {/* Search Type */}

          <div>
            <label
              htmlFor="search-type"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Search Type
            </label>

            <select
              id="search-type"
              value={searchType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setSearchType(e.target.value as SearchType);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="word">Word</option>
              <option value="lemma">Lemma</option>
              <option value="pos">POS</option>
            </select>
          </div>

          {/* Search Input */}

          <div>
            <label
              htmlFor="search-query"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              {searchLabel}
            </label>

            <input
              id="search-query"
              type="text"
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder={searchPlaceholder}
            />

            {searchType === "pos" && (
              <p className="mt-1.5 text-xs text-slate-400">
                Enter a BNC POS tag such as NN1 or VV0.
              </p>
            )}

            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="mt-3 w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Searching..." : "Go"}
            </button>
          </div>

          {/* Context Width */}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="context-window"
                className="text-sm font-medium text-slate-700"
              >
                Context window
              </label>

              <span className="text-sm text-slate-500">
                {pendingWindowSize} words
              </span>
            </div>

            <input
              id="context-window"
              type="range"
              min="1"
              max="25"
              step="1"
              value={pendingWindowSize}
              onChange={(e) => {
                const value = Number(e.target.value);
                setPendingWindowSize(value);
              }}
              className="w-full"
            />
          </div>

          {/* Rows Visible */}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Rows Visible Limit
            </label>

            <select
              value={limit}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setLimit(Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value={10}>10 Matches</option>
              <option value={20}>20 Matches</option>
              <option value={50}>50 Matches</option>
              <option value={100}>100 Matches</option>
            </select>
          </div>
        </div>

        {/* ------------------------------------------------ */}
        {/* Search information                               */}
        {/* ------------------------------------------------ */}

        {searchType !== "word" && (
          <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg mb-6">
            <p className="text-xs text-blue-800">
              {searchType === "lemma"
                ? "Lemma search finds all word forms sharing the specified lemma."
                : "POS search finds tokens with the specified BNC grammatical tag."}
            </p>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* Wildcard variants                                */}
        {/* ------------------------------------------------ */}

        {showVocabularyVariants && uniqueWords.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
            {/* Panel heading */}

            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Vocabulary Variants
                  </h4>

                  <p className="text-xs text-slate-500 mt-1">
                    {uniqueWords.length} distinct words found
                  </p>
                </div>

                {selectedWords.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelectedWords}
                    className="self-start sm:self-auto inline-flex items-center px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* ------------------------------------------------ */}
            {/* Selected variants                                */}
            {/* ------------------------------------------------ */}

            {selectedWords.length > 0 && (
              <div className="px-6 py-4 bg-blue-50/60 border-b border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                    Showing only
                  </span>

                  <span className="text-xs text-blue-600">
                    {selectedWords.length} selected
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedWords.map((word) => {
                    const matchingVariant = uniqueWords.find(
                      (item) => item.word === word,
                    );

                    return (
                      <button
                        key={`selected-${word}`}
                        type="button"
                        onClick={() => removeSelectedWord(word)}
                        title={`Remove ${word} from the display filter`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 text-white border border-blue-600 shadow-sm text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        <span>{word}</span>

                        {matchingVariant && (
                          <span className="text-blue-200">
                            {matchingVariant.count}
                          </span>
                        )}

                        <span
                          aria-hidden="true"
                          className="text-blue-200 text-sm leading-none"
                        >
                          ×
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ------------------------------------------------ */}
            {/* All variants                                     */}
            {/* ------------------------------------------------ */}

            <div className="p-6">
              <p className="text-xs text-slate-500 mb-3">
                Click a word to add or remove it from the concordance display.
              </p>

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
                {uniqueWords.map((item) => {
                  const isSelected = selectedWords.includes(item.word);

                  return (
                    <button
                      key={item.word}
                      type="button"
                      onClick={() => toggleWordSelection(item.word)}
                      aria-pressed={isSelected}
                      title={
                        isSelected
                          ? `Remove ${item.word}`
                          : `Show only ${item.word}`
                      }
                      className={`
                            inline-flex
                            items-center
                            gap-2
                            px-3
                            py-1.5
                            rounded-lg
                            text-xs
                            font-medium
                            border
                            cursor-pointer
                            transition-all
                            duration-150
                            select-none
                            ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700"
                            }
                          `}
                    >
                      <span>{item.word}</span>

                      <span
                        className={`
                              min-w-[1.5rem]
                              text-center
                              px-1.5
                              py-0.5
                              rounded-full
                              text-[10px]
                              leading-none
                              ${
                                isSelected
                                  ? "bg-blue-700 text-blue-100"
                                  : "bg-slate-100 text-slate-500"
                              }
                            `}
                      >
                        {item.count}
                      </span>

                      {isSelected && (
                        <span
                          aria-hidden="true"
                          className="text-blue-200 ml-0.5"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------ */}
        {/* Error                                            */}
        {/* ------------------------------------------------ */}

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

        {/* ------------------------------------------------ */}
        {/* Concordance table                                */}
        {/* ------------------------------------------------ */}

        <div className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl mb-6">
          <table className="w-full table-fixed border-collapse text-left text-sm font-mono">
            <thead className="bg-slate-50 font-sans border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold text-right w-[38%] text-xs tracking-wider uppercase">
                  Left Context
                </th>

                <th className="px-3 py-3 font-bold text-center text-red-600 bg-red-50/50 w-24 text-xs tracking-wider uppercase">
                  Target
                </th>

                <th className="px-4 py-3 font-semibold w-[38%] text-xs tracking-wider uppercase">
                  Right Context
                </th>

                <th className="px-4 py-3 font-semibold w-28 text-center text-xs tracking-wider uppercase">
                  Details
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-500 font-sans text-sm"
                  >
                    <span className="text-xs text-slate-500 animate-pulse flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Querying SQLite Index...
                    </span>
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-slate-400 font-sans text-sm"
                  >
                    No active token matches found matching query criteria.
                  </td>
                </tr>
              ) : (
                results.map((row) => (
                  <tr
                    key={`${row.id}-${row.position ?? "word"}`}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-right text-slate-600 align-top break-words whitespace-normal">
                      {row.left_context}
                    </td>

                    <td className="px-3 py-3.5 text-center font-bold text-red-600 bg-red-50/30 border-x border-red-100 align-top whitespace-nowrap">
                      {row.target}
                    </td>

                    <td className="px-4 py-3.5 text-left text-slate-600 align-top break-words whitespace-normal">
                      {row.right_context}
                    </td>

                    <td className="px-4 py-3.5 text-center align-top">
                      <button
                        type="button"
                        onClick={() => setSelectedResult(row)}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------ */}
        {/* Pagination                                       */}
        {/* ------------------------------------------------ */}

        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <button
              onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
              disabled={page === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-700">
                Showing page{" "}
                <span className="font-semibold text-slate-900">{page}</span> of{" "}
                <span className="font-semibold text-slate-900">
                  {totalPages}
                </span>{" "}
                total blocks
              </p>
            </div>

            <div>
              <nav
                className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                aria-label="Pagination"
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed select-none"
                >
                  ◀ Prev
                </button>

                <div className="relative inline-flex items-center border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 select-none">
                  Page {page} / {totalPages}
                </div>

                <button
                  onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-r-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed select-none"
                >
                  Next ▶
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Collocations</h2>

          <p className="mt-1 text-sm text-slate-500">
            Find the words occurring around the current search term.
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label
                htmlFor="collocation-left"
                className="block mb-2 text-sm font-medium text-slate-700"
              >
                Words to left
              </label>

              <input
                id="collocation-left"
                type="number"
                min="0"
                max="20"
                value={collocationLeft}
                onChange={(e) =>
                  setCollocationLeft(
                    Math.max(0, Math.min(20, Number(e.target.value))),
                  )
                }
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg
            text-sm focus:outline-none focus:ring-2
            focus:ring-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="collocation-right"
                className="block mb-2 text-sm font-medium text-slate-700"
              >
                Words to right
              </label>

              <input
                id="collocation-right"
                type="number"
                min="0"
                max="20"
                value={collocationRight}
                onChange={(e) =>
                  setCollocationRight(
                    Math.max(0, Math.min(20, Number(e.target.value))),
                  )
                }
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg
            text-sm focus:outline-none focus:ring-2
            focus:ring-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={fetchCollocations}
              disabled={collocationsLoading || !submittedQuery.trim()}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg
          text-sm font-medium hover:bg-slate-700
          disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {collocationsLoading
                ? "Finding collocations..."
                : "Find collocations"}
            </button>
          </div>

          {collocationsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{collocationsError}</p>
            </div>
          )}

          {collocationsLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Querying SQLite Index...
            </div>
          ) : collocations.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No collocations found.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      Collocate
                    </th>

                    <th className="px-4 py-3 text-right font-semibold text-slate-700">
                      Frequency
                    </th>

                    <th className="px-4 py-3 text-right font-semibold text-slate-700">
                      Left
                    </th>

                    <th className="px-4 py-3 text-right font-semibold text-slate-700">
                      Right
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {collocations.map((collocation) => (
                    <tr key={collocation.word} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {collocation.word}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600">
                        {collocation.frequency.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600">
                        {collocation.left_frequency.toLocaleString()}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-600">
                        {collocation.right_frequency.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------- */}
      {/* Details Modal                                      */}
      {/* -------------------------------------------------- */}

      {selectedResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6"
          role="presentation"
          onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) {
              setSelectedResult(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="details-title"
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
          >
            {/* Modal header */}

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2
                  id="details-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Result Details
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  Information about this concordance result
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                aria-label="Close details"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>

            {/* Modal content */}

            <div className="p-6 space-y-6">
              {/* Corpus information */}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Corpus Information
                </h3>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <dt className="text-xs text-slate-400">Transcript</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.filename}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Corpus ID</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.corpus_id}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Speaker</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.speaker}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Utterance Number</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.utterance_number}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Genre</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.genre || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Transcription</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.trans || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">
                      Speaker Confidence
                    </dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.who_confidence || "—"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-400">Position</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-0.5">
                      {selectedResult.position ?? "—"}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Linguistic information */}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Linguistic Information
                </h3>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <dt className="text-xs text-slate-400">Target</dt>
                    <dd className="text-sm font-bold text-red-600 mt-1">
                      {selectedResult.target}
                    </dd>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <dt className="text-xs text-slate-400">Lemma</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">
                      {selectedResult.lemma || "—"}
                    </dd>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <dt className="text-xs text-slate-400">POS</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">
                      {selectedResult.pos || "—"}
                    </dd>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <dt className="text-xs text-slate-400">Class</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">
                      {selectedResult.class || "—"}
                    </dd>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 col-span-2 sm:col-span-4">
                    <dt className="text-xs text-slate-400">USAS</dt>
                    <dd className="text-sm font-medium text-slate-800 mt-1">
                      {selectedResult.usas || "—"}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Full utterance */}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  Full Utterance
                </h3>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-sm font-mono text-slate-700 leading-relaxed">
                    {selectedResult.utterance}
                  </p>
                </div>
              </section>
            </div>

            {/* Modal footer */}

            <div className="flex justify-end px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
