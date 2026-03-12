type PageItem = number | 'ellipsis';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const buildPageItems = (page: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const items: PageItem[] = [];
  const start = Math.max(2, page - 2);
  const end = Math.min(totalPages - 1, page + 2);

  items.push(1);
  if (start > 2) items.push('ellipsis');

  for (let current = start; current <= end; current += 1) {
    items.push(current);
  }

  if (end < totalPages - 1) items.push('ellipsis');
  items.push(totalPages);
  return items;
};

export default function Pagination({ page, totalPages, onPageChange, className = '' }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(page, totalPages);
  const buttonBase =
    'min-w-[2rem] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}>
      <span className="text-xs text-slate-600">Page {page} of {totalPages}</span>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className={buttonBase}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={`page-${item}`}
              type="button"
              className={`${buttonBase} ${item === page ? 'border-primary-400 bg-primary-50 text-primary-700' : ''}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={buttonBase}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
