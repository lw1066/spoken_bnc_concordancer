import type { UniqueWord } from "../types/corpus";

interface VocabularyVariantsProps {
  showVocabularyVariants: boolean;
  uniqueWords: UniqueWord[];
  selectedWords: string[];
  clearSelectedWords: () => void;
  removeSelectedWord: (word: string) => void;
  toggleWordSelection: (word: string) => void;
}

export default function VocabularyVariants({
  showVocabularyVariants,
  uniqueWords,
  selectedWords,
  clearSelectedWords,
  removeSelectedWord,
  toggleWordSelection,
}: VocabularyVariantsProps) {
  if (!showVocabularyVariants || uniqueWords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
      {/* Panel heading */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              Vocabulary Variants
            </h4>

            <p className="text-xs text-slate-500 mt-1">
              {uniqueWords.length} distinct words found
            </p>
          </div>

          {selectedWords.length > 0 && (
            <button
              type="button"
              onClick={clearSelectedWords}
              className="self-start sm:self-auto inline-flex items-center px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Selected variants */}
      {selectedWords.length > 0 && (
        <div className="px-6 py-4 bg-blue-50/60 border-b border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              Showing only
            </span>

            <span className="text-xs text-blue-600">
              {selectedWords.length} selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedWords.map((word) => {
              const matchingVariant = uniqueWords.find(
                (item) => item.word === word,
              );

              return (
                <button
                  key={`selected-${word}`}
                  type="button"
                  onClick={() => removeSelectedWord(word)}
                  title={`Remove ${word} from the display filter`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 text-white border border-blue-600 shadow-sm text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  <span>{word}</span>

                  {matchingVariant && (
                    <span className="text-blue-200">
                      {matchingVariant.count}
                    </span>
                  )}

                  <span
                    aria-hidden="true"
                    className="text-blue-200 text-sm leading-none"
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* All variants */}
      <div className="p-6">
        <p className="text-xs text-slate-500 mb-3">
          Click a word to add or remove it from the concordance display.
        </p>

        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
          {uniqueWords.map((item) => {
            const isSelected = selectedWords.includes(item.word);

            return (
              <button
                key={item.word}
                type="button"
                onClick={() => toggleWordSelection(item.word)}
                aria-pressed={isSelected}
                title={
                  isSelected ? `Remove ${item.word}` : `Show only ${item.word}`
                }
                className={`
                  inline-flex
                  items-center
                  gap-2
                  px-3
                  py-1.5
                  rounded-lg
                  text-xs
                  font-medium
                  border
                  cursor-pointer
                  transition-all
                  duration-150
                  select-none
                  ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700"
                  }
                `}
              >
                <span>{item.word}</span>

                <span
                  className={`
                    min-w-[1.5rem]
                    text-center
                    px-1.5
                    py-0.5
                    rounded-full
                    text-[10px]
                    leading-none
                    ${
                      isSelected
                        ? "bg-blue-700 text-blue-100"
                        : "bg-slate-100 text-slate-500"
                    }
                  `}
                >
                  {item.count}
                </span>

                {isSelected && (
                  <span aria-hidden="true" className="text-blue-200 ml-0.5">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
