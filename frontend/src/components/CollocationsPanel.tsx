import { Fragment, useState } from "react";

import type { Collocation } from "../types/corpus";
import CollocationDistributionChart from "./CollocationDistributionChart";

interface CollocationsPanelProps {
  collocations: Collocation[];
  collocationsLoading: boolean;
  collocationsError: string | null;
  selectedCollocation: string | null;
  collocationTarget: string;
  setPage: (page: number) => void;
  updateCollocationFilter: (
    filter: { word: string; position: number | null } | null,
  ) => void;
  setSelectedCollocation: (
    value: string | null | ((current: string | null) => string | null),
  ) => void;
  activeCollocate: string | null;
  activePosition: number | null;
}

export default function CollocationsPanel({
  collocations,
  collocationsLoading,
  collocationsError,
  selectedCollocation,
  collocationTarget,
  setPage,
  updateCollocationFilter,
  setSelectedCollocation,
  activeCollocate,
  activePosition,
}: CollocationsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl mb-6">
      <button
        type="button"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        aria-expanded={isExpanded}
        className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Collocation Results
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            See how often each collocate occurs within the selected window. Open
            Distribution to see its position relative to the search term.
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600">
          {isExpanded ? "Hide" : "Show"}
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {isExpanded ? (
              <path d="m18 15-6-6-6 6" />
            ) : (
              <path d="m6 9 6 6 6-6" />
            )}
          </svg>
        </span>
      </button>

      {isExpanded && (
        <div className="p-6">
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

                                updateCollocationFilter({
                                  word: collocation.word,
                                  position: null,
                                });
                              }}
                              className={`rounded-full border-2 px-3 py-1 transition-colors
                                  focus:outline-none focus:ring-2 focus:ring-blue-300
                                  ${
                                    activeCollocate === collocation.word
                                      ? "border-blue-500 text-blue-700"
                                      : "border-transparent text-slate-800 hover:border-blue-500 hover:text-blue-700"
                                  }`}
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
                                  target={collocationTarget}
                                  positions={collocation.positions}
                                  activePosition={
                                    activeCollocate === collocation.word
                                      ? activePosition
                                      : null
                                  }
                                  onPositionClick={(position) => {
                                    setPage(1);

                                    updateCollocationFilter({
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
      )}
    </div>
  );
}
