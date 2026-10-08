interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const goToPreviousPage = () => {
    onPageChange(Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    onPageChange(Math.min(totalPages, page + 1));
  };

  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          type="button"
          onClick={goToPreviousPage}
          disabled={isFirstPage}
          className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={goToNextPage}
          disabled={isLastPage}
          className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-700">
            Showing page{" "}
            <span className="font-semibold text-slate-900">{page}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalPages}</span>{" "}
            total blocks
          </p>
        </div>

        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={isFirstPage}
              className="relative inline-flex items-center rounded-l-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed select-none"
            >
              ◀ Prev
            </button>

            <div className="relative inline-flex items-center border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 select-none">
              Page {page} / {totalPages}
            </div>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={isLastPage}
              className="relative inline-flex items-center rounded-r-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 focus:z-20 disabled:opacity-40 disabled:cursor-not-allowed select-none"
            >
              Next ▶
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
