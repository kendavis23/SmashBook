import type { JSX } from "react";
import { Breadcrumb } from "@repo/ui";
import { formatUTCDate } from "@repo/ui";
import { Receipt, RefreshCw, ExternalLink, FileText } from "lucide-react";
import type { InvoiceItem } from "../../types";

type Props = {
    invoices: InvoiceItem[];
    isLoading: boolean;
    error: Error | null;
    onRefresh: () => void;
};

function InvoiceStatusBadge({ status }: { status: string | null }): JSX.Element {
    if (!status) return <span className="text-xs text-muted-foreground">—</span>;
    const cls =
        status === "paid"
            ? "bg-success/15 text-success"
            : status === "open"
              ? "bg-warning/15 text-warning"
              : status === "void"
                ? "bg-muted text-muted-foreground"
                : "bg-destructive/15 text-destructive";
    return (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cls}`}>
            {status}
        </span>
    );
}

function formatAmount(cents: number, currency: string): string {
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: currency.toUpperCase(),
    }).format(cents / 100);
}

export default function InvoicesView({
    invoices,
    isLoading,
    error,
    onRefresh,
}: Props): JSX.Element {
    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Invoices" }]} />

            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Receipt size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Invoices
                                    </h1>
                                    {invoices.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {invoices.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    SmashBook subscription invoices for your organisation.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh invoices"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                <div className="px-5 py-5 sm:px-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-20">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading invoices…</span>
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                            {error.message}
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <Receipt size={24} className="text-muted-foreground/40" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">
                                No invoices yet
                            </h3>
                            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
                                Invoices will appear here once your subscription billing begins.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/20">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Invoice
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Period
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Amount
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {invoices.map((inv) => (
                                        <tr
                                            key={inv.id}
                                            className="bg-background transition-colors hover:bg-muted/10"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">
                                                    {inv.number ?? inv.id}
                                                </div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    {formatUTCDate(inv.created)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {inv.period_start && inv.period_end
                                                    ? `${formatUTCDate(inv.period_start)} – ${formatUTCDate(inv.period_end)}`
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-foreground">
                                                    {formatAmount(inv.amount_due, inv.currency)}
                                                </div>
                                                {inv.amount_paid !== inv.amount_due ? (
                                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                                        Paid:{" "}
                                                        {formatAmount(
                                                            inv.amount_paid,
                                                            inv.currency
                                                        )}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3">
                                                <InvoiceStatusBadge status={inv.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {inv.invoice_pdf ? (
                                                        <a
                                                            href={inv.invoice_pdf}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-outline px-2.5 py-1.5 text-xs"
                                                            aria-label={`Download PDF for invoice ${inv.number ?? inv.id}`}
                                                        >
                                                            <FileText size={12} /> PDF
                                                        </a>
                                                    ) : null}
                                                    {inv.hosted_invoice_url ? (
                                                        <a
                                                            href={inv.hosted_invoice_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-outline px-2.5 py-1.5 text-xs"
                                                            aria-label={`View invoice ${inv.number ?? inv.id}`}
                                                        >
                                                            <ExternalLink size={12} /> View
                                                        </a>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
