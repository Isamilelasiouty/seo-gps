import React from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onExportAll?: () => void;
  exportLabel?: string;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  onExportAll,
  exportLabel,
  totalItems,
  pageSize,
  onPageSizeChange,
  className = '',
}) => {
  const { locale } = useI18n();
  const isAr = locale !== 'en';

  if (totalPages <= 0) return null;

  // Generate numbered page buttons (identical to user screenshot)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  const startIndex = pageSize && totalItems ? (currentPage - 1) * pageSize + 1 : 1;
  const endIndex = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : totalItems || 0;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface/70 border-t border-surface-hairline text-xs ${className}`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Items count summary and Per-Page selector */}
      <div className="flex items-center gap-3 text-ink-muted">
        {totalItems !== undefined && (
          <span className="font-medium">
            {isAr
              ? `عرض ${startIndex.toLocaleString()} - ${endIndex.toLocaleString()} من أصل ${totalItems.toLocaleString()} صفحة`
              : `Showing ${startIndex.toLocaleString()} - ${endIndex.toLocaleString()} of ${totalItems.toLocaleString()} pages`}
          </span>
        )}

        {pageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l rtl:border-l-0 rtl:border-r border-surface-hairline pl-3 rtl:pl-0 rtl:pr-3">
            <span>{isAr ? 'لكل صفحة:' : 'Per page:'}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-ink font-bold shadow-2xs hover:border-gold cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls & Export All Button (Exact User Screenshot Style!) */}
      <div className="flex items-center gap-2 select-none">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          title={isAr ? 'الصفحة السابقة' : 'Previous Page'}
          aria-label="Previous Page"
        >
          {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Numbered Segmented Buttons */}
        <div className="inline-flex rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs bg-white divide-x rtl:divide-x-reverse divide-slate-200/90">
          {pageNumbers.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold bg-white"
                >
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#F95721] text-white font-extrabold shadow-inner'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 font-semibold'
                }`}
                title={isAr ? `صفحة ${p}` : `Page ${p}`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          title={isAr ? 'الصفحة التالية' : 'Next Page'}
          aria-label="Next Page"
        >
          {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Export All Action Button (Exact User Screenshot Style!) */}
        {onExportAll && (
          <button
            onClick={onExportAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ml-1 rtl:ml-0 rtl:mr-1"
            title={isAr ? 'تصدير كافة الصفحات إلى ملف CSV / Excel' : 'Export All Pages to CSV'}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.2] text-slate-600" />
            <span>{exportLabel || (isAr ? 'تصدير الكل' : 'Export All')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
