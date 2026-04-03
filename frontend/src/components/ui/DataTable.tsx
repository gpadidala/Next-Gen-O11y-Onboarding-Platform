import { useState, useCallback, type ReactNode } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { cn } from '@/utils/cn';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDef<TRow> {
  /** Unique key for the column (typically matching a field in TRow) */
  id: string;
  /** Header text */
  header: string;
  /** Render function for cell content; receives the full row */
  cell: (row: TRow) => ReactNode;
  /** Enable sorting on this column */
  sortable?: boolean;
  /** Comparison function used when sorting. Default: string comparison of cell toString() */
  sortFn?: (a: TRow, b: TRow) => number;
  /** Column alignment */
  align?: 'left' | 'center' | 'right';
  /** Column width class (e.g. "w-48") */
  width?: string;
}

export interface DataTableProps<TRow> {
  /** Column definitions */
  columns: ColumnDef<TRow>[];
  /** Row data */
  data: TRow[];
  /** Unique key extractor for each row */
  rowKey: (row: TRow, index: number) => string | number;
  /** Number of rows per page (0 = no pagination) */
  pageSize?: number;
  /** Message shown when data is empty */
  emptyMessage?: string;
  /** Additional class names for the wrapper */
  className?: string;
  /** Loading state */
  loading?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function DataTable<TRow>({
  columns,
  data,
  rowKey,
  pageSize = 10,
  emptyMessage = 'No data to display.',
  className,
  loading = false,
}: DataTableProps<TRow>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const [page, setPage] = useState(0);

  /* ------ Sorting logic ------ */
  const handleSort = useCallback(
    (colId: string) => {
      if (sortColumn === colId) {
        // Cycle: asc -> desc -> null
        setSortDir((prev) =>
          prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc',
        );
        if (sortDir === 'desc') setSortColumn(null);
      } else {
        setSortColumn(colId);
        setSortDir('asc');
      }
      setPage(0);
    },
    [sortColumn, sortDir],
  );

  /* ------ Sorted data ------ */
  const sortedData = (() => {
    if (!sortColumn || !sortDir) return data;

    const col = columns.find((c) => c.id === sortColumn);
    if (!col) return data;

    const sorted = [...data].sort((a, b) => {
      if (col.sortFn) return col.sortFn(a, b);
      const aVal = String(col.cell(a) ?? '');
      const bVal = String(col.cell(b) ?? '');
      return aVal.localeCompare(bVal);
    });

    return sortDir === 'desc' ? sorted.reverse() : sorted;
  })();

  /* ------ Pagination ------ */
  const isPaginated = pageSize > 0;
  const totalPages = isPaginated ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const pageData = isPaginated
    ? sortedData.slice(page * pageSize, (page + 1) * pageSize)
    : sortedData;

  /* ------ Alignment helpers ------ */
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  /* ------ Render ------ */
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-slate-200 bg-surface-primary',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          {/* Head */}
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500',
                    alignClass(col.align),
                    col.width,
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.id)}
                      className="group inline-flex items-center gap-1 hover:text-slate-700"
                      aria-label={`Sort by ${col.header}`}
                    >
                      {col.header}
                      <span className="ml-0.5 text-slate-400 group-hover:text-slate-600">
                        {sortColumn === col.id && sortDir === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : sortColumn === col.id && sortDir === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              /* Loading skeleton rows */
              Array.from({ length: Math.min(pageSize || 5, 5) }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              /* Empty state */
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Inbox className="h-10 w-10" aria-hidden="true" />
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <tr
                  key={rowKey(row, page * (pageSize || 0) + i)}
                  className="transition-colors hover:bg-slate-50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'whitespace-nowrap px-4 py-3 text-sm text-slate-700',
                        alignClass(col.align),
                        col.width,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {isPaginated && data.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-500">
            Showing{' '}
            <span className="font-medium text-slate-700">
              {page * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-slate-700">
              {Math.min((page + 1) * pageSize, sortedData.length)}
            </span>{' '}
            of{' '}
            <span className="font-medium text-slate-700">{sortedData.length}</span>{' '}
            results
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <span className="px-2 text-xs font-medium text-slate-600">
              {page + 1} / {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
export type { ColumnDef as DataTableColumn };
export default DataTable;
