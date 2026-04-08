import React, { useState, useMemo } from 'react';
import { FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight, FiSearch } from 'react-icons/fi';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string;
  actions?: React.ReactNode;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No data found',
  emptyDescription,
  searchable = false,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  onRowClick,
  rowKey,
  actions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (loading) return <TableSkeleton rows={pageSize} />;
  if (error) return <ErrorBanner message={error} onRetry={onRetry} />;
  if (data.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="space-y-3">
      {(searchable || actions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          {searchable && (
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder={searchPlaceholder}
                aria-label="Search table"
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none border bg-slate-50 dark:bg-white/[0.04] border-black/[0.06] dark:border-white/[0.06] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500"
              />
            </div>
          )}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-black/[0.06] dark:border-white/[0.06]">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/[0.03]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200' : ''} ${col.className || ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {paged.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row) : i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`bg-white dark:bg-transparent transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02]' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-slate-700 dark:text-slate-300 ${col.className || ''}`}>
                    {col.render ? col.render(row) : (row[col.key] != null ? String(row[col.key]) : '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{sorted.length} result{sorted.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-30">
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} aria-label="Next page"
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-30">
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
