import type { SearchType, PunctuationMode } from "../types/corpus";

type SearchControlsProps = {
  searchType: SearchType;
  query: string;
  loading: boolean;
  searchLabel: string;
  searchPlaceholder: string;
  onSearchTypeChange: (value: SearchType) => void;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  submittedQuery: string;
  submittedSearchType: SearchType;
  concordanceCount: number;
  resetSearch: () => void;
  punctuation: PunctuationMode;
  onPunctuationChange: (value: PunctuationMode) => void;
};

export default function SearchControls({
  searchType,
  query,
  loading,
  searchLabel,
  searchPlaceholder,
  onSearchTypeChange,
  onQueryChange,
  onSearch,
  submittedQuery,
  submittedSearchType,
  concordanceCount,
  resetSearch,
  punctuation,
  onPunctuationChange,
}: SearchControlsProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Concordances</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Choose a word or lemma to examine.
        </p>
      </div>
      {/* Search Type */}{" "}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="search-type"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Search Type{" "}
          </label>
          <select
            id="search-type"
            value={searchType}
            onChange={(event) =>
              onSearchTypeChange(event.target.value as SearchType)
            }
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value="word">Word</option>
            <option value="lemma">Lemma</option>
            <option value="phrase">Phrase</option>
          </select>
        </div>

        {searchType === "phrase" && (
          <div className="min-w-0 flex-1">
            <label
              htmlFor="punctuation-mode"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Punctuation
            </label>
            <select
              id="punctuation-mode"
              value={punctuation}
              onChange={(event) =>
                onPunctuationChange(event.target.value as PunctuationMode)
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ignore">Ignore</option>
              <option value="include">Include</option>
            </select>
          </div>
        )}
        {/* Search Input and Go Button */}
        <div className="min-w-0">
          <label
            htmlFor="search-query"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            {searchLabel}
          </label>

          <input
            id="search-query"
            type="text"
            maxLength={20}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            placeholder={searchPlaceholder}
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="flex gap-2 xl:ml-8">
          {" "}
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className={`h-10 shrink-0 rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              loading
                ? "bg-slate-400 hover:bg-slate-400"
                : query.trim() === submittedQuery.trim() &&
                    searchType === submittedSearchType &&
                    submittedQuery.trim() !== ""
                  ? "bg-blue-600"
                  : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading
              ? "Searching..."
              : query.trim() === submittedQuery.trim() &&
                  searchType === submittedSearchType &&
                  submittedQuery.trim() !== ""
                ? `${concordanceCount.toLocaleString()} concordances`
                : "Find concordances"}
          </button>
          <button
            type="button"
            onClick={resetSearch}
            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
