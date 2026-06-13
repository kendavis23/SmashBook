import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Banknote, RefreshCw } from "lucide-react";
import { Breadcrumb, Pagination, SelectInput, formatCurrency, formatUTCDate } from "@repo/ui";
import type { Payout, PayoutReconStatus, PayoutStatus } from "../../types";
import { PAYOUT_RECON_LABELS, PAYOUT_STATUS_LABELS, RECON_FILTER_OPTIONS } from "../../types";

type Props = {
    payouts: Payout[];
    isLoading: boolean;
    error: Error | null;
    reconFilter: string;
    onReconFilterChange: (value: string) => void;
    onRefresh: () => void;
};

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<PayoutStatus, string> = {
    pending: "bg-muted text-muted-foreground",
    in_transit: "bg-info/15 text-info",
    paid: "bg-success/15 text-success",
    failed: "bg-destructive/10 text-destructive",
    canceled: "bg-muted text-muted-foreground",
};

const RECON_BADGE: Record<PayoutReconStatus, string> = {
    matched: "bg-success/15 text-success",
    partial: "bg-warning/15 text-warning",
    unmatched: "bg-muted text-muted-foreground",
    discrepancy: "bg-destructive/10 text-destructive",
};

export default function PayoutsView({
    payouts,
    isLoading,
    error,
    reconFilter,
    onReconFilterChange,
    onRefresh,
}: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(payouts.length / PAGE_SIZE);
    const pagePayouts = useMemo(
        () => payouts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [payouts, page]
    );

    useEffect(() => setPage(0), [payouts]);

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Payouts" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Banknote size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Payouts
                                    </h1>
                                    {payouts.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {payouts.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Stripe payouts and reconciliation status for your club.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <div className="w-44">
                            <SelectInput
                                name="recon_status"
                                value={reconFilter}
                                options={RECON_FILTER_OPTIONS}
                                onValueChange={onReconFilterChange}
                                placeholder="All statuses"
                            />
                        </div>
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh payouts"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="px-5 py-5 sm:px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading payouts…</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : payouts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <Banknote size={24} className="text-muted-foreground/40" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">
                                No payouts yet
                            </h3>
                            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                                Payouts from Stripe will appear here once your club starts receiving
                                them.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            <th className="px-4 py-3">Arrival</th>
                                            <th className="px-4 py-3">Amount</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Reconciliation</th>
                                            <th className="px-4 py-3">Descriptor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagePayouts.map((payout) => (
                                            <tr
                                                key={payout.id}
                                                className="border-b border-border last:border-0 hover:bg-muted/20"
                                            >
                                                <td className="px-4 py-3 text-foreground">
                                                    {payout.arrival_date
                                                        ? formatUTCDate(payout.arrival_date)
                                                        : "—"}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {formatCurrency(payout.amount)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[payout.status]}`}
                                                    >
                                                        {PAYOUT_STATUS_LABELS[payout.status]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RECON_BADGE[payout.reconciliation_status]}`}
                                                    >
                                                        {
                                                            PAYOUT_RECON_LABELS[
                                                                payout.reconciliation_status
                                                            ]
                                                        }
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {payout.statement_descriptor ?? "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4">
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    totalItems={payouts.length}
                                    pageSize={PAGE_SIZE}
                                    onPageChange={setPage}
                                />
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
