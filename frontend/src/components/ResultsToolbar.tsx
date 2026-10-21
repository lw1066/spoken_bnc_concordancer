type ResultsToolbarProps = {
  pendingWindowSize: number;
  limit: number;
  onWindowSizeChange: (value: number) => void;
  onLimitChange: (value: number) => void;
};

export default function ResultsToolbar({
  pendingWindowSize,
  limit,
  onWindowSizeChange,
  onLimitChange,
}: ResultsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Context Width */}
      <div className="w-full sm:max-w-48 sm:flex-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            htmlFor="context-width"
            className="text-sm font-medium text-slate-700"
          >
            Context Width
          </label>

          <span className="whitespace-nowrap text-sm font-semibold text-slate-800">
            {pendingWindowSize} words
          </span>
        </div>

        <input
          id="context-width"
          type="range"
          min={1}
          max={20}
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
      <div className="w-full sm:w-32 sm:shrink-0">
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
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
