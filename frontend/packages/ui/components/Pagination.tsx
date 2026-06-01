import type { JSX } from "react";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationProps = {
    /** Current page, 0-indexed. */
    page: number;
    /** Total number of pages. */
    totalPages: number;
    /** Total number of items across all pages (for the "1–10 of 542" label). */
    totalItems: number;
    /** Items shown per page (for the range label). */
    pageSize: number;
    onPageChange: (page: number) => void;
    /** How many page buttons to show on each side of the current page. */
    siblingCount?: number;
};

type PageToken = number | "start-ellipsis" | "end-ellipsis";

/**
 * Builds a windowed page list — first and last pages are always shown, the
 * current page is flanked by `siblingCount` neighbours, and gaps collapse to
 * an ellipsis. e.g. 1 … 9 [10] 11 … 32 (never the full 1..N run).
 */
function buildPageTokens(page: number, totalPages: number, siblingCount: number): PageToken[] {
    // first + last + current + 2*siblings + 2 ellipses
    const maxButtons = siblingCount * 2 + 5;
    if (totalPages <= maxButtons) {
        return Array.from({ length: totalPages }, (_, i) => i);
    }

    const leftSibling = Math.max(page - siblingCount, 1);
    const rightSibling = Math.min(page + siblingCount, totalPages - 2);

    const showLeftEllipsis = leftSibling > 1;
    const showRightEllipsis = rightSibling < totalPages - 2;

    const tokens: PageToken[] = [0];

    if (showLeftEllipsis) {
        tokens.push("start-ellipsis");
    } else {
        for (let i = 1; i < leftSibling; i++) {
            tokens.push(i);
        }
    }

    for (let i = leftSibling; i <= rightSibling; i++) {
        tokens.push(i);
    }

    if (showRightEllipsis) {
        tokens.push("end-ellipsis");
    } else {
        for (let i = rightSibling + 1; i < totalPages - 1; i++) {
            tokens.push(i);
        }
    }

    tokens.push(totalPages - 1);
    return tokens;
}

const btnCls =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-card px-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

export function Pagination({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    siblingCount = 1,
}: PaginationProps): JSX.Element | null {
    const tokens = useMemo(
        () => buildPageTokens(page, totalPages, siblingCount),
        [page, totalPages, siblingCount]
    );

    if (totalPages <= 1) {
        return null;
    }

    const from = page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, totalItems);

    return (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-6">
            <span className="shrink-0 text-xs text-muted-foreground">
                {from}–{to} of {totalItems}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 0}
                    className={btnCls}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={14} />
                </button>

                {tokens.map((token) =>
                    typeof token === "number" ? (
                        <button
                            key={token}
                            onClick={() => onPageChange(token)}
                            className={
                                token === page
                                    ? "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-cta bg-cta px-1.5 text-xs font-medium text-cta-foreground"
                                    : btnCls
                            }
                            aria-label={`Page ${token + 1}`}
                            aria-current={token === page ? "page" : undefined}
                        >
                            {token + 1}
                        </button>
                    ) : (
                        <span
                            key={token}
                            className="inline-flex h-8 min-w-8 items-center justify-center text-xs text-muted-foreground"
                            aria-hidden="true"
                        >
                            …
                        </span>
                    )
                )}

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages - 1}
                    className={btnCls}
                    aria-label="Next page"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
