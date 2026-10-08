import { useState, useEffect } from "react";
import useCorpusSearch from "./hooks/useCorpusSearch";

import type { KwicResult } from "./types/corpus";
import SearchControls from "./components/SearchControls";
import CollocationControls from "./components/CollocationControls";
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
    collocationsSearched,
    canRunCollocations,
    collocationMessage,
    collocationsLoading,
    collocationsError,
    selectedCollocation,
    setSelectedCollocation,
    setCollocationFilter,
    fetchCollocations,
    handleSearch,
    totalPages,
    toggleWordSelection,
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

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Search</h2>

            <p className="text-xs text-slate-500 mt-1">
              Search the corpus and configure collocation analysis.
            </p>
          </div>

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
            <div className="bg-blue-50 border border-blue-100 px-4 py-3 rounded-lg mt-4">
              <p className="text-xs text-blue-800">
                {searchType === "lemma"
                  ? "Lemma search finds all word forms sharing the specified lemma."
                  : "POS search finds tokens with the specified BNC grammatical tag."}
              </p>
            </div>
          )}
        </section>

        <VocabularyVariants
          showVocabularyVariants={showVocabularyVariants}
          uniqueWords={uniqueWords}
          selectedWords={selectedWords}
          toggleWordSelection={toggleWordSelection}
        />

        <section className="mb-10">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6 shadow-sm">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {totalMatches > 0 && (
            <>
              <CollocationControls
                collocationLeft={collocationLeft}
                collocationRight={collocationRight}
                setCollocationLeft={setCollocationLeft}
                setCollocationRight={setCollocationRight}
                fetchCollocations={fetchCollocations}
                loading={collocationsLoading}
                canRunCollocations={canRunCollocations}
                collocationMessage={collocationMessage}
              />
              {collocationsSearched && (
                <CollocationsPanel
                  collocations={collocations}
                  collocationsLoading={collocationsLoading}
                  collocationsError={collocationsError}
                  selectedCollocation={selectedCollocation}
                  collocationTarget={
                    selectedWords.length === 1
                      ? selectedWords[0]
                      : submittedQuery
                  }
                  setPage={setPage}
                  setCollocationFilter={setCollocationFilter}
                  setSelectedCollocation={setSelectedCollocation}
                />
              )}
            </>
          )}

          <div className="mt-8">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">
              {loading
                ? " Fetching concordances"
                : ` Results: showing ${totalMatches.toLocaleString()} concordances`}
            </h3>

            <ConcordanceTable
              results={results}
              loading={loading}
              setSelectedResult={setSelectedResult}
            />
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </section>

        <ResultDetailsModal
          selectedResult={selectedResult}
          setSelectedResult={setSelectedResult}
        />
      </div>
    </div>
  );
}
