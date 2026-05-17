import { Breadcrumb, formatCurrency } from "@repo/ui";
import {
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Minus,
    Plus,
    RefreshCw,
    Search,
} from "lucide-react";
import type { JSX } from "react";
import { useMemo, useState } from "react";

import type { Plan } from "../../types";

interface PlansViewProps {
    plans: Plan[];
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
    onCreateClick: () => void;
    onManageClick: (planId: string) => void;
}

function BoolCell({ value }: { value: boolean }): JSX.Element {
    return value ? (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
            <Check size={10} strokeWidth={2.5} />
        </span>
    ) : (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
            <Minus size={10} strokeWidth={2} />
        </span>
    );
}

function NullableCell({
    value,
    formatter,
}: {
    value: number | null;
    formatter?: (v: number) => string;
}): JSX.Element {
    if (value === null) {
        return <span className="text-muted-foreground/40">—</span>;
    }
    return <span>{formatter ? formatter(value) : value}</span>;
}

const PLANS_PER_PAGE = 2;

function PlanMetric({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: JSX.Element | string | number;
    mono?: boolean;
}): JSX.Element {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2">
            <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
            <dd
                className={`shrink-0 text-[13px] font-semibold text-foreground ${mono ? "font-mono text-[11px]" : ""}`}
            >
                {value}
            </dd>
        </div>
    );
}

function PlanGroup({ title, children }: { title: string; children: JSX.Element }): JSX.Element {
    return (
        <section className="border-t border-border pt-3.5 first:border-t-0 first:pt-0">
            <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-foreground/75">
                {title}
            </h3>
            {children}
        </section>
    );
}

function PlanCard({
    plan,
    onManageClick,
}: {
    plan: Plan;
    onManageClick: (planId: string) => void;
}): JSX.Element {
    return (
        <article className="rounded-lg border border-border bg-background shadow-sm transition-shadow duration-150 hover:shadow-md">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">
                        {plan.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-xl font-semibold tracking-tight text-foreground">
                            {formatCurrency(plan.price_per_month)}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">/ mo</span>
                    </div>
                </div>
                <button
                    onClick={() => onManageClick(plan.id)}
                    className="btn-outline min-h-9 shrink-0 px-3 text-sm"
                >
                    <ExternalLink size={14} /> Manage
                </button>
            </div>
            <div className="space-y-4 p-4">
                <PlanGroup title="Plan Details">
                    <dl className="grid grid-cols-2 gap-1.5">
                        <PlanMetric label="Setup fee" value={formatCurrency(plan.setup_fee)} />
                        <PlanMetric label="Trial days" value={plan.trial_days} />
                    </dl>
                </PlanGroup>

                <PlanGroup title="Limits">
                    <dl className="grid grid-cols-2 gap-1.5">
                        <PlanMetric label="Clubs" value={plan.max_clubs} />
                        <PlanMetric label="Courts / club" value={plan.max_courts_per_club} />
                        <PlanMetric label="Staff" value={plan.max_staff_users} />
                        <PlanMetric
                            label="API calls / mo"
                            value={<NullableCell value={plan.max_api_calls_per_month} />}
                        />
                    </dl>
                </PlanGroup>

                <PlanGroup title="Features">
                    <dl className="grid grid-cols-2 gap-1.5">
                        <PlanMetric
                            label="Open games"
                            value={<BoolCell value={plan.open_games_feature} />}
                        />
                        <PlanMetric
                            label="Waitlist"
                            value={<BoolCell value={plan.waitlist_feature} />}
                        />
                        <PlanMetric
                            label="White label"
                            value={<BoolCell value={plan.white_label_enabled} />}
                        />
                        <PlanMetric
                            label="Analytics"
                            value={<BoolCell value={plan.analytics_enabled} />}
                        />
                    </dl>
                </PlanGroup>

                <PlanGroup title="Revenue Sharing">
                    <dl className="grid grid-cols-2 gap-1.5">
                        <PlanMetric
                            label="Booking fee %"
                            value={
                                <NullableCell
                                    value={plan.booking_fee_pct}
                                    formatter={(v) => `${v}%`}
                                />
                            }
                        />
                        <PlanMetric
                            label="Rev. share %"
                            value={
                                <NullableCell
                                    value={plan.revenue_share_pct}
                                    formatter={(v) => `${v}%`}
                                />
                            }
                        />
                        <PlanMetric
                            label="3rd-party %"
                            value={
                                <NullableCell
                                    value={plan.third_party_revenue_share_pct}
                                    formatter={(v) => `${v}%`}
                                />
                            }
                        />
                        <PlanMetric
                            label="Overage / booking"
                            value={
                                <NullableCell
                                    value={plan.overage_fee_per_booking}
                                    formatter={(v) => formatCurrency(v)}
                                />
                            }
                        />
                    </dl>
                </PlanGroup>

                <PlanGroup title="Stripe">
                    <dl>
                        <PlanMetric
                            label="Stripe price ID"
                            value={
                                plan.stripe_price_id ?? (
                                    <span className="text-muted-foreground/40">—</span>
                                )
                            }
                            mono
                        />
                    </dl>
                </PlanGroup>
            </div>
        </article>
    );
}

export default function PlansView({
    plans,
    isLoading,
    error,
    onRefresh,
    onCreateClick,
    onManageClick,
}: PlansViewProps): JSX.Element {
    const [searchQuery, setSearchQuery] = useState("");
    const [pageIndex, setPageIndex] = useState(0);

    const filteredPlans = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return plans;
        return plans.filter((plan) => plan.name.toLowerCase().includes(query));
    }, [plans, searchQuery]);

    const pageCount = Math.max(1, Math.ceil(filteredPlans.length / PLANS_PER_PAGE));
    const safePageIndex = Math.min(pageIndex, pageCount - 1);
    const visiblePlans = filteredPlans.slice(
        safePageIndex * PLANS_PER_PAGE,
        safePageIndex * PLANS_PER_PAGE + PLANS_PER_PAGE
    );
    const showingFrom = filteredPlans.length === 0 ? 0 : safePageIndex * PLANS_PER_PAGE + 1;
    const showingTo = Math.min((safePageIndex + 1) * PLANS_PER_PAGE, filteredPlans.length);

    return (
        <div className="w-full space-y-5">
            <Breadcrumb items={[{ label: "Plans" }]} showHomeIcon={false} />
            <section className="card-surface overflow-hidden">
                <header className="flex flex-col gap-3 border-b border-border bg-muted/10 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-xs">
                                <BookOpen size={16} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-semibold tracking-tight text-foreground">
                                        Subscription Plans
                                    </h1>
                                    {plans.length > 0 ? (
                                        <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-xs">
                                            {plans.length} total
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Manage platform subscription plans
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                            onClick={onRefresh}
                            className="btn-outline min-h-10 px-4"
                            aria-label="Refresh plans"
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <button onClick={onCreateClick} className="btn-cta min-h-10 px-4">
                            <Plus size={14} /> New Plan
                        </button>
                    </div>
                </header>

                <div className="py-5">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-3 py-16">
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-sm text-muted-foreground">Loading plans…</span>
                        </div>
                    ) : error ? (
                        <div className="mx-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:mx-6">
                            {error}
                        </div>
                    ) : plans.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-sm text-muted-foreground">No plans yet.</p>
                            <button onClick={onCreateClick} className="btn-cta mt-4 min-h-10 px-4">
                                <Plus size={14} /> Create first plan
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 px-4 sm:px-6">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full lg:max-w-sm">
                                    <Search
                                        size={15}
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/55"
                                    />
                                    <input
                                        value={searchQuery}
                                        onChange={(event) => {
                                            setSearchQuery(event.target.value);
                                            setPageIndex(0);
                                        }}
                                        placeholder="Search plans by name"
                                        className="input-base h-10 pl-9"
                                    />
                                </div>
                                <div className="text-xs font-medium text-muted-foreground">
                                    Showing {showingFrom}-{showingTo} of {filteredPlans.length}
                                </div>
                            </div>

                            {filteredPlans.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-12 text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        No matching plans
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Try searching with a different plan name.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {visiblePlans.map((plan) => (
                                            <PlanCard
                                                key={plan.id}
                                                plan={plan}
                                                onManageClick={onManageClick}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Page {safePageIndex + 1} of {pageCount}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPageIndex((page) => Math.max(0, page - 1))
                                                }
                                                disabled={safePageIndex === 0}
                                                className="btn-outline min-h-10 px-3"
                                            >
                                                <ChevronLeft size={14} /> Previous
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPageIndex((page) =>
                                                        Math.min(pageCount - 1, page + 1)
                                                    )
                                                }
                                                disabled={safePageIndex >= pageCount - 1}
                                                className="btn-cta min-h-10 px-3"
                                            >
                                                Next <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
