interface CollocationControlsProps {
  collocationLeft: number;
  collocationRight: number;
  setCollocationLeft: (value: number) => void;
  setCollocationRight: (value: number) => void;
  fetchCollocations: () => void;
  loading: boolean;
  canRunCollocations: boolean;
  collocationMessage?: string;
  minCollocationFrequency: number;
  setMinCollocationFrequency: (value: number) => void;
  collocationsSearched: boolean;
  collocationCount: number;
  searchAllVariants: boolean;
  showAllVariantsOption: boolean;
  handleSearchAllVariantsChange: (checked: boolean) => void;
}

export default function CollocationControls({
  collocationLeft,
  collocationRight,
  setCollocationLeft,
  setCollocationRight,
  fetchCollocations,
  loading,
  canRunCollocations,
  collocationMessage,
  minCollocationFrequency,
  setMinCollocationFrequency,
  collocationsSearched,
  collocationCount,
  searchAllVariants,
  showAllVariantsOption,
  handleSearchAllVariantsChange,
}: CollocationControlsProps) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Heading */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Collocations</h3>

        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {searchAllVariants
            ? "Collocations will include all grammatical variants. Set window and frequency limits."
            : canRunCollocations
              ? "Collocations will only include the single variant chosen. Set window and frequency limits."
              : collocationMessage}
        </p>
        {showAllVariantsOption && (
          <label className="mb-4 flex items-start gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={searchAllVariants}
              onChange={(event) =>
                handleSearchAllVariantsChange(event.target.checked)
              }
              disabled={loading}
              className="mt-0.5 rounded border-slate-300"
            />
            <span>Use all variants</span>
          </label>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="collocation-left"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Left
          </label>

          <input
            id="collocation-left"
            type="number"
            min={0}
            max={5}
            value={collocationLeft}
            disabled={!canRunCollocations}
            onChange={(e) =>
              setCollocationLeft(
                Math.max(0, Math.min(5, Number(e.target.value))),
              )
            }
            className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="collocation-right"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Right
          </label>

          <input
            id="collocation-right"
            type="number"
            min={0}
            max={5}
            value={collocationRight}
            disabled={!canRunCollocations}
            onChange={(e) =>
              setCollocationRight(
                Math.max(0, Math.min(5, Number(e.target.value))),
              )
            }
            className="h-10 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
        </div>
        <div className="min-w-0 flex-2">
          <label
            htmlFor="min-collocation-frequency"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Min frequency
          </label>

          <select
            id="min-collocation-frequency"
            value={minCollocationFrequency}
            onChange={(event) =>
              setMinCollocationFrequency(Number(event.target.value))
            }
            disabled={!canRunCollocations || loading}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm
      focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200
      disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value={3}>3 or more</option>
            <option value={5}>5 or more</option>
            <option value={10}>10 or more</option>
            <option value={20}>20 or more</option>
            <option value={50}>50 or more</option>
            <option value={100}>100 or more</option>
          </select>
        </div>

        <button
          type="button"
          onClick={fetchCollocations}
          disabled={loading || !canRunCollocations}
          className={`h-10 ml-8 w-full rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
            loading
              ? "bg-slate-400 hover:bg-slate-400"
              : collocationsSearched
                ? "bg-blue-600"
                : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading
            ? "Searching..."
            : collocationsSearched
              ? `${collocationCount} collocations`
              : "Find collocations"}
        </button>
      </div>
    </div>
  );
}
