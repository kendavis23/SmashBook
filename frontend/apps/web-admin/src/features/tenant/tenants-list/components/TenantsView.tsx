import { Breadcrumb } from "@repo/ui";
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    RefreshCw,
    Search,
} from "lucide-react";
import { type JSX, useState } from "react";

import type { TenantSummary } from "../../types";

function statusBadge(status: string | null, isActive: boolean): JSX.Element {
    if (!isActive) {
        return (
            <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-medium text-destructive">
                Suspended
            </span>
        );
    }
    if (!status) {
        return (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                No subscription
            </span>
        );
    }
    const map: Record<string, { bg: string; text: string }> = {
        active: { bg: "bg-success/15", text: "text-success" },
        trialing: { bg: "bg-info/15", text: "text-info" },
        past_due: { bg: "bg-warning/15", text: "text-warning" },
        canceled: { bg: "bg-destructive/15", text: "text-destructive" },
        unpaid: { bg: "bg-destructive/15", text: "text-destructive" },
    };
    const cls = map[status] ?? { bg: "bg-muted", text: "text-muted-foreground" };
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls.bg} ${cls.text}`}
        >
            {status.replace(/_/g, " ")}
        </span>
    );
}

interface TenantsViewProps {
    tenants: TenantSummary[];
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
    onManageClick: (tenantId: string) => void;
}

export default function TenantsView({
    tenants,
    isLoading,
    error,
    onRefresh,
    onManageClick,
}: TenantsViewProps): JSX.Element {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const filtered = search.trim()
        ? tenants.filter(
              (t) =>
                  t.name.toLowerCase().includes(search.toLowerCase()) ||
                  t.subdomain.toLowerCase().includes(search.toLowerCase())
          )
        : tenants;

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    function handleSearch(value: string) {
        setSearch(value);
        setPage(1);
    }

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Tenants" }]} showHomeIcon={false} />
            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <Building2 size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Tenants
                                    </h1>
                                    {tenants.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {tenants.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage platform tenants and subscriptions
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <div className="relative">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search by name or subdomain…"
                                className="h-10 w-64 rounded-lg border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh tenants"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>
                </header>

                <div>
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-16">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading tenants…</span>
                        </div>
                    ) : error ? (
                        <div className="mx-5 my-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mx-6">
                            {error}
                        </div>
                    ) : tenants.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm text-muted-foreground">No tenants yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Name
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Subdomain
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Custom Domain
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Plan
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Active
                                        </th>
                                        <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Status
                                        </th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Clubs
                                        </th>
                                        <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                                            Manage
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="py-12 text-center text-sm text-muted-foreground"
                                            >
                                                No tenants match your search.
                                            </td>
                                        </tr>
                                    ) : null}
                                    {paginated.map((tenant) => (
                                        <tr
                                            key={tenant.id}
                                            className="transition hover:bg-muted/20"
                                        >
                                            <td className="px-3 py-3 text-sm font-medium text-foreground">
                                                {tenant.name}
                                            </td>
                                            <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                                                {tenant.subdomain}
                                            </td>
                                            <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                                                {tenant.custom_domain ?? (
                                                    <span className="text-muted-foreground/50">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-muted-foreground">
                                                {tenant.plan_name}
                                            </td>
                                            <td className="px-3 py-3 text-sm">
                                                {tenant.is_active ? (
                                                    <span className="inline-flex items-center gap-1 font-medium text-success">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 font-medium text-destructive">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                                        No
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-sm">
                                                {statusBadge(
                                                    tenant.subscription_status,
                                                    tenant.is_active
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right text-sm text-muted-foreground">
                                                {tenant.club_count}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    onClick={() => onManageClick(tenant.id)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted"
                                                >
                                                    <ExternalLink size={13} /> Manage
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {!isLoading && !error && filtered.length > PAGE_SIZE ? (
                    <footer className="flex items-center justify-between border-t border-border px-5 py-3 sm:px-6">
                        <span className="text-xs text-muted-foreground">
                            {(safePage - 1) * PAGE_SIZE + 1}–
                            {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition ${
                                        p === safePage
                                            ? "border-cta bg-cta text-cta-foreground"
                                            : "border-border bg-background text-foreground hover:bg-muted"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                                aria-label="Next page"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </footer>
                ) : null}
            </section>
        </div>
    );
}
