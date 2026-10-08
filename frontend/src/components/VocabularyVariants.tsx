import type { UniqueWord } from "../types/corpus";

interface VocabularyVariantsProps {
  showVocabularyVariants: boolean;
  uniqueWords: UniqueWord[];
  selectedWords: string[];
  toggleWordSelection: (word: string) => void;
}

export default function VocabularyVariants({
  showVocabularyVariants,
  uniqueWords,
  selectedWords,
  toggleWordSelection,
}: VocabularyVariantsProps) {
  if (!showVocabularyVariants || uniqueWords.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
      {/* Panel heading */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100">
        <h4 className="text-sm font-semibold text-slate-800">
          Vocabulary Variants
        </h4>

        <p className="text-xs text-slate-500 mt-1">
          {uniqueWords.length} distinct words found
        </p>
      </div>

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
