import React from 'react';
import { useLocale } from '../../utils/LocaleContext';

export interface PaginationProps {
  currentPage?: number;
  page?: number;
  totalPages: number;
  totalCount?: number;
  limit?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limitOptions?: number[];
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  loading?: boolean;
  itemNameAr?: string;
  itemNameEn?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Pagination({
  currentPage,
  page,
  totalPages,
  totalCount,
  limit = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50],
  hasNextPage,
  hasPrevPage,
  loading = false,
  itemNameAr,
  itemNameEn,
  className = '',
  style = {},
}: PaginationProps) {
  const { locale, direction } = useLocale();
  const isRtl = direction === 'rtl' || locale === 'ar';
  const activePage = Math.max(1, currentPage ?? page ?? 1);

  // If there's 0 or 1 page and no totalCount or count <= limit, and no limit changer, hide or show minimal
  if (totalPages <= 1 && (!totalCount || totalCount <= limit) && !onLimitChange) {
    if (totalCount && totalCount > 0) {
      return (
        <div
          className={`dary-pagination-bar ${className}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderTop: '1px solid #E2E8F0',
            fontSize: '0.85rem',
            color: '#64748B',
            ...style,
          }}
        >
          <span>
            {locale === 'ar'
              ? `عرض ${totalCount} من أصل ${totalCount} عنصر`
              : `Showing ${totalCount} of ${totalCount} items`}
          </span>
        </div>
      );
    }
    return null;
  }

  const effectiveTotalPages = Math.max(1, totalPages);
  const canGoPrev = hasPrevPage !== undefined ? hasPrevPage : activePage > 1;
  const canGoNext = hasNextPage !== undefined ? hasNextPage : activePage < effectiveTotalPages;

  // Calculate range text
  const fromItem = totalCount !== undefined && totalCount > 0 ? (activePage - 1) * limit + 1 : 0;
  const toItem = totalCount !== undefined && totalCount > 0 ? Math.min(totalCount, activePage * limit) : 0;

  // Smart page numbers calculation
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (effectiveTotalPages <= maxVisible + 2) {
      for (let i = 1; i <= effectiveTotalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    // Always include page 1
    pages.push(1);

    const start = Math.max(2, activePage - 1);
    const end = Math.min(effectiveTotalPages - 1, activePage + 1);

    if (start > 2) {
      pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < effectiveTotalPages - 1) {
      pages.push('...');
    }

    // Always include last page
    pages.push(effectiveTotalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const prevIcon = isRtl ? '→' : '←';
  const nextIcon = isRtl ? '←' : '→';

  return (
    <div
      className={`dary-pagination-container ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.25rem',
        borderTop: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        borderRadius: '0 0 12px 12px',
        ...style,
      }}
    >
      {/* Left side: Item Count & Limit Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          fontSize: '0.85rem',
          color: '#64748B',
        }}
      >
        {totalCount !== undefined && totalCount > 0 ? (
          <span style={{ fontWeight: 600 }}>
            {locale === 'ar'
              ? `عرض ${fromItem} - ${toItem} من أصل ${totalCount} ${itemNameAr || 'عنصر'}`
              : `Showing ${fromItem} - ${toItem} of ${totalCount} ${itemNameEn || 'items'}`}
          </span>
        ) : (
          <span style={{ fontWeight: 600 }}>
            {locale === 'ar'
              ? `الصفحة ${activePage} من ${effectiveTotalPages}`
              : `Page ${activePage} of ${effectiveTotalPages}`}
          </span>
        )}

        {onLimitChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              {locale === 'ar' ? 'لكل صفحة:' : 'Per page:'}
            </span>
            <select
              value={limit}
              disabled={loading}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                color: '#0B2A4A',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                outline: 'none',
              }}
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page Navigation Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Previous Button */}
        <button
          type="button"
          disabled={!canGoPrev || loading}
          onClick={() => onPageChange(activePage - 1)}
          aria-label={locale === 'ar' ? 'الصفحة السابقة' : 'Previous page'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: !canGoPrev || loading ? '#E2E8F0' : '#CBD5E1',
            backgroundColor: !canGoPrev || loading ? '#F8FAFC' : '#FFFFFF',
            color: !canGoPrev || loading ? '#94A3B8' : '#0B2A4A',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: !canGoPrev || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{prevIcon}</span>
          <span>{locale === 'ar' ? 'السابق' : 'Prev'}</span>
        </button>

        {/* Page Numbers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: '0.3rem 0.5rem',
                    color: '#94A3B8',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === activePage;

            return (
              <button
                key={pageNum}
                type="button"
                disabled={loading}
                onClick={() => onPageChange(pageNum)}
                style={{
                  minWidth: '34px',
                  height: '34px',
                  padding: '0 0.5rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isActive ? '#0B2A4A' : '#E2E8F0',
                  backgroundColor: isActive ? '#0B2A4A' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#334155',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 800 : 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={!canGoNext || loading}
          onClick={() => onPageChange(activePage + 1)}
          aria-label={locale === 'ar' ? 'الصفحة التالية' : 'Next page'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: !canGoNext || loading ? '#E2E8F0' : '#CBD5E1',
            backgroundColor: !canGoNext || loading ? '#F8FAFC' : '#FFFFFF',
            color: !canGoNext || loading ? '#94A3B8' : '#0B2A4A',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: !canGoNext || loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span>{locale === 'ar' ? 'التالي' : 'Next'}</span>
          <span>{nextIcon}</span>
        </button>
      </div>
    </div>
  );
}
