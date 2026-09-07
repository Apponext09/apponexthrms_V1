import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading?: boolean;
}

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  loading = false,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const canPrevious = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border">
      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-semibold text-foreground">
          {startItem}-{endItem}
        </span>{' '}
        of{' '}
        <span className="font-semibold text-foreground">
          {totalCount.toLocaleString()}
        </span>{' '}
        results
      </div>

      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Per page:</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={loading}
          className="h-8 px-3 text-xs border border-input rounded-lg bg-background text-foreground font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrevious || loading}
          className="rounded-lg"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1 px-3 text-sm">
          <span className="font-semibold text-foreground">{page}</span>
          <span className="text-muted-foreground">of</span>
          <span className="font-semibold text-foreground">
            {totalPages || 1}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext || loading}
          className="rounded-lg"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
