/**
 * usePagination — Simple pagination hook for list-based pages.
 *
 * Usage:
 *   const { page, pageSize, offset, totalPages, next, prev, goTo } = usePagination({ total, pageSize: 20 });
 *   const visibleItems = allItems.slice(offset, offset + pageSize);
 */

import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  total: number;
  pageSize?: number;
  initialPage?: number;
}

export function usePagination({ total, pageSize = 20, initialPage = 1 }: UsePaginationOptions) {
  const [page, setPage] = useState(initialPage);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Clamp page to valid range when total changes
  const currentPage = Math.min(page, totalPages);

  const offset = (currentPage - 1) * pageSize;

  const next = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prev = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const goTo = useCallback(
    (target: number) => {
      setPage(Math.max(1, Math.min(target, totalPages)));
    },
    [totalPages]
  );

  return {
    page: currentPage,
    pageSize,
    offset,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    next,
    prev,
    goTo,
  };
}
