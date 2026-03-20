import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  totalCount?: number;
  pageSize?: number;
};

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}

export function Pagination({ currentPage, totalPages, buildHref, totalCount, pageSize = 20 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const baseBtn =
    "inline-flex h-11 min-w-[44px] items-center justify-center rounded-xl border px-3 text-sm font-medium transition-colors sm:h-9 sm:min-w-[36px]";
  const activeBtn = "border-primary bg-primary text-white";
  const normalBtn =
    "border-gray-200 bg-white text-text-primary hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800";
  const disabledBtn =
    "border-gray-200 text-gray-400 cursor-not-allowed dark:border-gray-800 dark:text-gray-600";

  const rangeStart = totalCount != null ? (currentPage - 1) * pageSize + 1 : null;
  const rangeEnd = totalCount != null ? Math.min(currentPage * pageSize, totalCount) : null;

  return (
    <nav
      aria-label="Paginación"
      className="mt-4 flex items-center justify-between gap-2"
    >
      {/* Range indicator */}
      {totalCount != null && (
        <span className="hidden text-xs text-text-secondary dark:text-gray-400 sm:block">
          Mostrando {rangeStart}–{rangeEnd} de {totalCount}
        </span>
      )}

      {/* Mobile: anterior / info / siguiente */}
      <div className="flex flex-1 items-center justify-between sm:hidden">
        {prevDisabled ? (
          <span className={`${baseBtn} ${disabledBtn}`}>← Anterior</span>
        ) : (
          <Link href={buildHref(currentPage - 1)} className={`${baseBtn} ${normalBtn}`}>
            ← Anterior
          </Link>
        )}
        <span className="text-sm text-text-secondary dark:text-gray-400">
          {currentPage} / {totalPages}
        </span>
        {nextDisabled ? (
          <span className={`${baseBtn} ${disabledBtn}`}>Siguiente →</span>
        ) : (
          <Link href={buildHref(currentPage + 1)} className={`${baseBtn} ${normalBtn}`}>
            Siguiente →
          </Link>
        )}
      </div>

      {/* Desktop: numerado con ellipsis */}
      <div className={`hidden sm:flex sm:items-center sm:gap-1 ${totalCount == null ? "sm:ml-auto" : ""}`}>
        {prevDisabled ? (
          <span className={`${baseBtn} ${disabledBtn}`}>←</span>
        ) : (
          <Link href={buildHref(currentPage - 1)} className={`${baseBtn} ${normalBtn}`}>
            ←
          </Link>
        )}

        {pages.map((page, i) =>
          page === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex h-9 min-w-[36px] items-center justify-center text-sm text-text-secondary dark:text-gray-400"
            >
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildHref(page)}
              className={`${baseBtn} ${page === currentPage ? activeBtn : normalBtn}`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </Link>
          ),
        )}

        {nextDisabled ? (
          <span className={`${baseBtn} ${disabledBtn}`}>→</span>
        ) : (
          <Link href={buildHref(currentPage + 1)} className={`${baseBtn} ${normalBtn}`}>
            →
          </Link>
        )}
      </div>
    </nav>
  );
}
