import type { KwicResult } from "../types/corpus";

interface ConcordanceTableProps {
  results: KwicResult[];
  loading: boolean;
  setSelectedResult: (result: KwicResult) => void;
}

export default function ConcordanceTable({
  results,
  loading,
  setSelectedResult,
}: ConcordanceTableProps) {
  return (
    <div className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl mb-6">
      <table className="w-full table-fixed border-collapse text-left text-sm font-mono">
        <thead className="bg-slate-50 font-sans border-b border-slate-200 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold text-right w-[38%] text-xs tracking-wider uppercase">
              Left Context
            </th>
            <th className="px-3 py-3 font-bold text-center text-red-600 bg-red-50/50 w-24 text-xs tracking-wider uppercase">
              Target
            </th>
            <th className="px-4 py-3 font-semibold w-[38%] text-xs tracking-wider uppercase">
              Right Context
            </th>
            <th className="px-4 py-3 font-semibold w-28 text-center text-xs tracking-wider uppercase">
              Details
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {loading ? (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-12 text-center text-slate-500 font-sans text-sm"
              >
                <span className="text-xs text-slate-500 animate-pulse inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Querying SQLite Index...
                </span>
              </td>
            </tr>
          ) : results.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-12 text-center text-slate-400 font-sans text-sm"
              >
                No active token matches found matching query criteria.
              </td>
            </tr>
          ) : (
            results.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/70 transition-colors"
              >
                <td className="px-4 py-3.5 text-right text-slate-600 align-top break-words whitespace-normal">
                  {row.left_context}
                </td>
                <td className="px-3 py-3.5 text-center font-bold text-red-600 bg-red-50/30 border-x border-red-100 align-top whitespace-nowrap">
                  {row.target}
                </td>
                <td className="px-4 py-3.5 text-left text-slate-600 align-top break-words whitespace-normal">
                  {row.right_context}
                </td>
                <td className="px-4 py-3.5 text-center align-top">
                  <button
                    type="button"
                    onClick={() => setSelectedResult(row)}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                  >
                    Details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
