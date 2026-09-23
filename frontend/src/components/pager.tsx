'use client';

import { Button } from '@/components/ui/button';

type PagerProps = {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
};

export function Pager({ page, total, limit, onPageChange, loading = false }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
      <p className="text-sm text-stone-500" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
