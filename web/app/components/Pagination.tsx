"use client";
import Link from "next/link";

export type PaginationProps = {
  page: number;
  // Either provide pageCount or (total and take)
  pageCount?: number;
  total?: number;
  take?: number;
  // For client-side usage you may pass makeHref, but avoid passing from Server Components
  makeHref?: (page: number) => string;
  // Safe alternative for Server Components: base path and optional static query
  hrefBase?: string; // e.g. "/admin/bookings"
  hrefQuery?: Record<string, string | number | boolean | null | undefined>;
  className?: string;
  onPageChange?: (page: number) => void;
};

export function Pagination({ page, pageCount, total, take, makeHref, hrefBase, hrefQuery, className = "", onPageChange }: PaginationProps) {
  const computedPageCount = pageCount ?? (total && take ? Math.max(1, Math.ceil(total / take)) : 1);
  const prev = Math.max(1, page - 1);
  const next = Math.min(computedPageCount, page + 1);
  const disablePrev = page <= 1;
  const disableNext = page >= computedPageCount;

  const buildHref = (targetPage: number) => {
    if (makeHref) return makeHref(targetPage);
    if (hrefBase) {
      const sp = new URLSearchParams();
      sp.set("page", String(targetPage));
      if (hrefQuery) {
        Object.entries(hrefQuery).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
        });
      }
      const qs = sp.toString();
      return qs ? `${hrefBase}?${qs}` : hrefBase;
    }
    return "#";
  };

  const handleClick = (targetPage: number, e?: React.MouseEvent) => {
    if (onPageChange) {
      e?.preventDefault();
      onPageChange(targetPage);
    }
  };

  return (
    <div className={`flex items-center justify-between ${className}`.trim()}>
      <Link
        href={buildHref(prev)}
        className={`btn btn-ghost btn-sm ${disablePrev ? "opacity-50 pointer-events-none" : ""}`}
        aria-disabled={disablePrev}
        onClick={(e) => !disablePrev && handleClick(prev, e)}
      >
        ← Precedente
      </Link>
      <div className="text-xs muted">{page} / {computedPageCount}</div>
      <Link
        href={buildHref(next)}
        className={`btn btn-ghost btn-sm ${disableNext ? "opacity-50 pointer-events-none" : ""}`}
        aria-disabled={disableNext}
        onClick={(e) => !disableNext && handleClick(next, e)}
      >
        Successiva →
      </Link>
    </div>
  );
}

export default Pagination;