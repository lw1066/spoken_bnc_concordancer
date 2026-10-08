import type { SearchType } from "../types/corpus";

type SearchControlsProps = {
  searchType: SearchType;
  query: string;
  pendingWindowSize: number;
  limit: number;
  loading: boolean;
  searchLabel: string;
  searchPlaceholder: string;
  onSearchTypeChange: (value: SearchType) => void;
  onQueryChange: (value: string) => void;
  onWindowSizeChange: (value: number) => void;
  onLimitChange: (value: number) => void;
  onSearch: () => void;
};

export default function SearchControls({
  searchType,
  query,
  pendingWindowSize,
  limit,
  loading,
  searchLabel,
  searchPlaceholder,
  onSearchTypeChange,
  onQueryChange,
  onWindowSizeChange,
  onLimitChange,
  onSearch,
}: SearchControlsProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[180px_1fr_auto]">
        {/* Search Type */}
        <div>
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
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
              if (event.key === "Enter") {
                onSearch();
              }
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        {/* Go Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
          >
            {loading ? "Searching..." : "Go"}
          </button>
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 md:grid-cols-2">
        {/* Context Width */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="context-width"
              className="text-sm font-medium text-slate-700"
            >
              Context Width
            </label>

            <span className="text-sm font-semibold text-slate-800">
              {pendingWindowSize} words
            </span>
          </div>

          <input
            id="context-width"
            type="range"
            min="1"
            max="20"
            value={pendingWindowSize}
            onChange={(event) => onWindowSizeChange(Number(event.target.value))}
            className="w-full cursor-pointer"
          />

          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>1</span>
            <span>20</span>
          </div>
        </div>

        {/* Rows Visible */}
        <div>
          <label
            htmlFor="rows-visible"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Rows Visible
          </label>

          <select
            id="rows-visible"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </div>
  );
}
