import type { SearchType } from "../types/corpus";

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
  validationMessage: string;
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
  validationMessage,
}: SearchControlsProps) {
  return (
    <div className="mb-0 h-full min-h-[200px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Concordances</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Choose a word or lemma to examine.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
        {/* Search type */}
        <div className="min-w-0">
          <label
            htmlFor="search-type"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Search Type
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
          <div className="mt-2 min-h-5" aria-hidden="true" />
        </div>

        {/* Search query */}
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
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearch();
            }}
            placeholder={searchPlaceholder}
            aria-invalid={Boolean(validationMessage)}
            aria-describedby={
              validationMessage ? "search-validation" : undefined
            }
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
          <div className="mt-2 min-h-5">
            {validationMessage && (
              <p
                id="search-validation"
                role="alert"
                className="text-sm leading-5 text-red-700"
              >
                {validationMessage}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 sm:pt-7">
          <button
            type="button"
            onClick={onSearch}
            disabled={loading || Boolean(validationMessage)}
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
