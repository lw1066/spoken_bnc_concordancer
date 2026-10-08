import { useState, useEffect } from "react";

import useCorpusSearch from "./hooks/useCorpusSearch";
import type { KwicResult } from "./types/corpus";
import SearchControls from "./components/SearchControls";
import VocabularyVariants from "./components/VocabularyVariants";
import ConcordanceTable from "./components/ConcordanceTable";
import Pagination from "./components/Pagination";
import ResultDetailsModal from "./components/ResultDetailsModal";
import CollocationsPanel from "./components/CollocationsPanel";

export default function App() {
  const [selectedResult, setSelectedResult] = useState<KwicResult | null>(null);

  const {
    searchType,
    setSearchType,
    submittedSearchType,
    query,
    setQuery,
    submittedQuery,
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
    setCollocationFilter,
    fetchCollocations,
    handleSearch,
    totalPages,
    toggleWordSelection,
    removeSelectedWord,
    clearSelectedWords,
  } = useCorpusSearch();

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
