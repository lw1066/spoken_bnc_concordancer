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
import ResultsToolbar from "./components/resultsToolbar";
import { getPosLabel } from "./utils/posLabels";

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
    updateCollocationLeft,
    collocationRight,
    updateCollocationRight,
    collocations,
    collocationsSearched,
    canRunCollocations,
    collocationMessage,
    collocationsLoading,
    collocationsError,
    selectedCollocation,
    setSelectedCollocation,
    updateCollocationFilter,
    fetchCollocations,
    handleSearch,
    totalPages,
    toggleWordSelection,
    minCollocationFrequency,
    updateMinCollocationFrequency,
    collocationFilter,
    displayedTotalMatches,
    originalTotalMatches,
    searchAllVariants,
    setSearchAllVariants,
    showAllVariantsOption,
    handleSearchAllVariantsChange,
    resetSearch,
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

  const formatVariantLabel = (variant: (typeof selectedWords)[number]) => {
    const label = getPosLabel(variant.pos ?? null);

    return `${variant.word} (${label})`;
  };

  const showVocabularyVariants = uniqueWords.length > 0;

  const searchPlaceholder =
    searchType === "word"
      ? "e.g. honest, run*, *ing"
      : searchType === "lemma"
        ? "e.g. game, run, be"
        : "e.g. run out, you know what";

  const searchLabel =
    searchType === "word"
      ? "Search Word Token"
      : searchType === "lemma"
        ? "Search Lemma"
        : "Search Phrase";

  const resultsHeading = collocationFilter
    ? `Results for "${
        selectedWords.length === 1
          ? formatVariantLabel(selectedWords[0])
          : submittedQuery
      }" + "${collocationFilter.word}"${
        collocationFilter.position === null
          ? ""
          : collocationFilter.position < 0
            ? ` (${Math.abs(collocationFilter.position)} words left)`
            : ` (${collocationFilter.position} words right)`
      }`
    : selectedWords.length > 0
      ? `Results for ${selectedWords
          .map((variant) => `"${formatVariantLabel(variant)}"`)
          .join(", ")}`
      : `Results for "${submittedQuery}"`;

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
            <p className="mt-1 text-xs text-slate-500">
              Search the corpus and configure collocation analysis.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 xl:flex-row">
            {/* Search controls */}
            <div className="w-fit max-w-full">
              <SearchControls
                searchType={searchType}
                query={query}
                submittedQuery={submittedQuery}
                submittedSearchType={submittedSearchType}
                concordanceCount={originalTotalMatches}
                loading={loading}
                searchLabel={searchLabel}
                searchPlaceholder={searchPlaceholder}
                onSearchTypeChange={setSearchType}
                onQueryChange={setQuery}
                onSearch={handleSearch}
                resetSearch={resetSearch}
              />
            </div>

            {/* Collocation controls */}
            {submittedQuery.trim() !== "" && (
              <div className="w-fit max-w-full ">
                <CollocationControls
                  collocationLeft={collocationLeft}
                  collocationRight={collocationRight}
                  setCollocationLeft={updateCollocationLeft}
                  setCollocationRight={updateCollocationRight}
                  fetchCollocations={fetchCollocations}
                  loading={collocationsLoading}
                  canRunCollocations={canRunCollocations}
                  collocationMessage={collocationMessage}
                  minCollocationFrequency={minCollocationFrequency}
                  setMinCollocationFrequency={updateMinCollocationFrequency}
                  collocationsSearched={collocationsSearched}
                  collocationCount={collocations.length}
                  searchAllVariants={searchAllVariants}
                  setSearchAllVariants={setSearchAllVariants}
                  showAllVariantsOption={showAllVariantsOption}
                  handleSearchAllVariantsChange={handleSearchAllVariantsChange}
                />
              </div>
            )}
          </div>
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

          {collocationsSearched && (
            <CollocationsPanel
              collocations={collocations}
              collocationsLoading={collocationsLoading}
              collocationsError={collocationsError}
              selectedCollocation={selectedCollocation}
              collocationTarget={
                selectedWords.length === 1
                  ? selectedWords[0].word
                  : submittedQuery
              }
              setPage={setPage}
              updateCollocationFilter={updateCollocationFilter}
              setSelectedCollocation={setSelectedCollocation}
              activeCollocate={collocationFilter?.word ?? null}
              activePosition={collocationFilter?.position ?? null}
            />
          )}

          {submittedQuery.trim() !== "" && (
            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Results header and display controls */}
              <div className="flex flex-col gap-4 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
                <h3 className="shrink-0 text-sm font-semibold text-slate-700">
                  {loading ? (
                    "Fetching concordances..."
                  ) : (
                    <>
                      <span className="text-slate-950">{resultsHeading}</span>
                      {" — "}
                      {displayedTotalMatches.toLocaleString()}{" "}
                      {displayedTotalMatches === 1
                        ? "occurrence"
                        : "occurrences"}
                    </>
                  )}
                </h3>
                {!loading && totalMatches > 0 && (
                  <div className="min-w-0 xl:w-auto xl:flex-none">
                    <ResultsToolbar
                      pendingWindowSize={pendingWindowSize}
                      limit={limit}
                      onWindowSizeChange={setPendingWindowSize}
                      onLimitChange={setLimit}
                    />
                  </div>
                )}
              </div>

              {/* Concordance results */}
              <div className="p-4">
                <ConcordanceTable
                  results={results}
                  loading={loading}
                  setSelectedResult={setSelectedResult}
                />
              </div>

              {/* Pagination */}
              <div className="border-t border-slate-200 px-4 py-3">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </div>
          )}
        </section>

        <ResultDetailsModal
          selectedResult={selectedResult}
          setSelectedResult={setSelectedResult}
        />
      </div>
    </div>
  );
}
