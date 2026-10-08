import type { KwicResult } from "../types/corpus";

interface ResultDetailsModalProps {
  selectedResult: KwicResult | null;
  setSelectedResult: (result: KwicResult | null) => void;
}

export default function ResultDetailsModal({
  selectedResult,
  setSelectedResult,
}: ResultDetailsModalProps) {
  if (!selectedResult) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6"
      role="presentation"
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          setSelectedResult(null);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
      >
        {/* Modal header */}

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2
              id="details-title"
              className="text-lg font-semibold text-slate-900"
            >
              Result Details
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Information about this concordance result
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedResult(null)}
            aria-label="Close details"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>

        {/* Modal content */}

        <div className="p-6 space-y-6">
          {/* Corpus information */}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Corpus Information
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-xs text-slate-400">Transcript</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.filename}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400">Corpus ID</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.corpus_id}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400">Speaker</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.speaker}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400">Utterance Number</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.utterance_number}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400">Genre</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.genre || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400">Transcription</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.trans || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400">Speaker Confidence</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.who_confidence || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-slate-400">Position</dt>
                <dd className="text-sm font-medium text-slate-800 mt-0.5">
                  {selectedResult.position ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Linguistic information */}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Linguistic Information
            </h3>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <dt className="text-xs text-slate-400">Target</dt>
                <dd className="text-sm font-bold text-red-600 mt-1">
                  {selectedResult.target}
                </dd>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <dt className="text-xs text-slate-400">Lemma</dt>
                <dd className="text-sm font-medium text-slate-800 mt-1">
                  {selectedResult.lemma || "—"}
                </dd>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <dt className="text-xs text-slate-400">POS</dt>
                <dd className="text-sm font-medium text-slate-800 mt-1">
                  {selectedResult.pos || "—"}
                </dd>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <dt className="text-xs text-slate-400">Class</dt>
                <dd className="text-sm font-medium text-slate-800 mt-1">
                  {selectedResult.class || "—"}
                </dd>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 col-span-2 sm:col-span-4">
                <dt className="text-xs text-slate-400">USAS</dt>
                <dd className="text-sm font-medium text-slate-800 mt-1">
                  {selectedResult.usas || "—"}
                </dd>
              </div>
            </dl>
          </section>

          {/* Full utterance */}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Full Utterance
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-mono text-slate-700 leading-relaxed">
                {selectedResult.utterance}
              </p>
            </div>
          </section>
        </div>

        {/* Modal footer */}

        <div className="flex justify-end px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={() => setSelectedResult(null)}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
