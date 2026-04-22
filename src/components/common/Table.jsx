import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Table({
  columns,
  data,
  loading = false,
  emptyMessage = 'Tidak ada data tersedia',
  pagination = null,
  onPageChange = null,
}) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                  style={{ width: column.width }}
                  onClick={column.onSort}
                >
                  <span className={column.onSort ? 'cursor-pointer hover:text-gold transition-colors' : ''}>
                    {column.header}
                    {column.sortIcon}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.04]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {columns.map((_, ci) => (
                    <td key={ci} className="px-4 py-4">
                      <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <p className="text-sm text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="hover:bg-white/[0.02] transition-colors">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className={`px-4 py-3 text-sm ${column.cellClassName || 'text-gray-300'}`}>
                      {column.render ? column.render(row, rowIndex) : row[column.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(pagination.currentPage - 1) * pagination.perPage + 1}–{Math.min(pagination.currentPage * pagination.perPage, pagination.total)} dari {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-2 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-400 px-2">
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}