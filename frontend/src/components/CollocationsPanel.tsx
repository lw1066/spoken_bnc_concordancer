import { Fragment } from "react";

import type { Collocation } from "../types/corpus";
import CollocationDistributionChart from "./CollocationDistributionChart";

interface CollocationsPanelProps {
  collocations: Collocation[];
  collocationsLoading: boolean;
  collocationsError: string | null;
  collocationLeft: number;
  collocationRight: number;
  selectedCollocation: string | null;
  submittedQuery: string;
  setCollocationLeft: (value: number) => void;
  setCollocationRight: (value: number) => void;
  fetchCollocations: () => void;
  setPage: (page: number) => void;
  setCollocationFilter: (
    filter: { word: string; position: number | null } | null,
  ) => void;
  setSelectedCollocation: (
    value: string | null | ((current: string | null) => string | null),
  ) => void;
}

export default function CollocationsPanel({
  collocations,
  collocationsLoading,
  collocationsError,
  collocationLeft,
  collocationRight,
  selectedCollocation,
  submittedQuery,
  setCollocationLeft,
  setCollocationRight,
  fetchCollocations,
  setPage,
  setCollocationFilter,
  setSelectedCollocation,
}: CollocationsPanelProps) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl mb-6">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Collocations</h2>

        <p className="mt-1 text-sm text-slate-500">
          See how often each collocate occurs within the selected window. Open
          Distribution to see its position relative to the search term.
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
              max="5"
              value={collocationLeft}
              onChange={(e) =>
                setCollocationLeft(
                  Math.max(0, Math.min(5, Number(e.target.value))),
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
              max="5"
              value={collocationRight}
              onChange={(e) =>
                setCollocationRight(
                  Math.max(0, Math.min(5, Number(e.target.value))),
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
          <div className="w-full max-w-2xl mx-auto overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Collocate
                  </th>

                  <th className="px-4 py-3 font-semibold text-slate-700">
                    Frequency
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {collocations.map((collocation) => {
                  const isSelected = selectedCollocation === collocation.word;

                  const positionCount = Object.keys(
                    collocation.positions,
                  ).length;

                  const hasDistribution = positionCount > 1;

                  return (
                    <Fragment key={collocation.word}>
                      <tr
                        className={
                          isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                        }
                      >
                        <td className="px-4 py-3 text-center font-medium text-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setPage(1);

                              setCollocationFilter({
                                word: collocation.word,
                                position: null,
                              });
                            }}
                            className="text-slate-800 hover:text-blue-600
                              hover:underline
                              focus:outline-none
                              focus:ring-2
                              focus:ring-slate-400
                              rounded"
                          >
                            {collocation.word}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          <div className="flex items-center justify-center gap-3">
                            <span>
                              {collocation.frequency.toLocaleString()}
                            </span>

                            {hasDistribution && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCollocation((current) =>
                                    current === collocation.word
                                      ? null
                                      : collocation.word,
                                  )
                                }
                                className="inline-flex items-center px-3 py-1.5
                                  text-sm font-medium rounded-md
                                  border border-slate-300
                                  hover:bg-slate-100
                                  focus:outline-none
                                  focus:ring-2
                                  focus:ring-slate-400"
                              >
                                {isSelected ? "Close graph" : "Distribution"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isSelected && (
                        <tr>
                          <td colSpan={2} className="px-6 py-6 bg-slate-50">
                            <div className="max-w-4xl mx-auto">
                              <CollocationDistributionChart
                                collocate={collocation.word}
                                target={submittedQuery}
                                positions={collocation.positions}
                                onPositionClick={(position) => {
                                  setPage(1);

                                  setCollocationFilter({
                                    word: collocation.word,
                                    position,
                                  });
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
