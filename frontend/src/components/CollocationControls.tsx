interface CollocationControlsProps {
  collocationLeft: number;
  collocationRight: number;
  setCollocationLeft: (value: number) => void;
  setCollocationRight: (value: number) => void;
  fetchCollocations: () => void;
  loading: boolean;
  canRunCollocations: boolean;
  collocationMessage?: string;
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
}: CollocationControlsProps) {
  return (
    <div className="mt-4 bg-white border border-slate-200 shadow-sm rounded-xl">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">
          Collocation Analysis
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {canRunCollocations
            ? "Configure how many words to examine on either side of the search term."
            : collocationMessage}
        </p>
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-end gap-4">
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
              max="5"
              value={collocationLeft}
              disabled={!canRunCollocations}
              onChange={(e) =>
                setCollocationLeft(
                  Math.max(0, Math.min(5, Number(e.target.value))),
                )
              }
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg
                text-sm focus:outline-none focus:ring-2
                focus:ring-slate-400
                disabled:bg-slate-100 disabled:text-slate-400
                disabled:cursor-not-allowed"
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
              max="5"
              value={collocationRight}
              disabled={!canRunCollocations}
              onChange={(e) =>
                setCollocationRight(
                  Math.max(0, Math.min(5, Number(e.target.value))),
                )
              }
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg
                text-sm focus:outline-none focus:ring-2
                focus:ring-slate-400
                disabled:bg-slate-100 disabled:text-slate-400
                disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="button"
            onClick={fetchCollocations}
            disabled={loading || !canRunCollocations}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg
              text-sm font-medium hover:bg-slate-700
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Finding collocations..." : "Find collocations"}
          </button>
        </div>
      </div>
    </div>
  );
}
