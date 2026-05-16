import { formatCurrency } from "@repo/ui";
import { BookOpen, ExternalLink, Plus, RefreshCw } from "lucide-react";
import type { JSX } from "react";

import type { Plan } from "../../types";

const labelCls = "mb-1.5 block text-sm font-medium text-foreground";

interface PlansViewProps {
    platformKey: string;
    isPlatformKeySet: boolean;
    platformKeyInput: string;
    plans: Plan[];
    isLoading: boolean;
    error: string | null;
    onPlatformKeyInputChange: (value: string) => void;
    onSetPlatformKey: () => void;
    onRefresh: () => void;
    onCreateClick: () => void;
    onManageClick: (planId: string) => void;
}

export default function PlansView({
    platformKey,
    isPlatformKeySet,
    platformKeyInput,
    plans,
    isLoading,
    error,
    onPlatformKeyInputChange,
    onSetPlatformKey,
    onRefresh,
    onCreateClick,
    onManageClick,
}: PlansViewProps): JSX.Element {
    return (
        <div className="w-full space-y-5 p-6">
            {/* Platform key section — always visible at top */}
            <section className="card-surface p-5">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <BookOpen size={17} />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground">Platform</h2>
                        <p className="text-xs text-muted-foreground">
                            The platform key is sent as the admin API header value.
                        </p>
                    </div>
                </div>
                {isPlatformKeySet ? (
                    <div className="flex items-center gap-3">
                        <span className="rounded-full border border-border bg-muted/30 px-3 py-1 text-sm text-muted-foreground font-mono">
                            {platformKey.replace(/./g, "•")}
                        </span>
                        <span className="text-xs text-success font-medium">Key set</span>
                    </div>
                ) : (
                    <div className="flex items-end gap-3">
                        <label className="flex-1">
                            <span className={labelCls}>Platform key</span>
                            <input
                                className="input-base"
                                value={platformKeyInput}
                                onChange={(e) => onPlatformKeyInputChange(e.target.value)}
                                placeholder="platform-key"
                                autoComplete="off"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") onSetPlatformKey();
                                }}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={onSetPlatformKey}
                            disabled={!platformKeyInput.trim()}
                            className="btn-cta min-h-10 px-4"
                        >
                            Set
                        </button>
                    </div>
                )}
            </section>

            {/* Plans list — only shown once key is set */}
            {isPlatformKeySet ? (
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

                    <div className="px-5 py-5 sm:px-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-3 py-16">
                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                                <span className="text-sm text-muted-foreground">
                                    Loading plans…
                                </span>
                            </div>
                        ) : error ? (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error}
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="text-sm text-muted-foreground">No plans yet.</p>
                                <button
                                    onClick={onCreateClick}
                                    className="btn-cta mt-4 min-h-10 px-4"
                                >
                                    <Plus size={14} /> Create first plan
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border">
                                            <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Name
                                            </th>
                                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Price/mo
                                            </th>
                                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Clubs
                                            </th>
                                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Courts
                                            </th>
                                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Staff
                                            </th>
                                            <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Trial days
                                            </th>
                                            <th className="pb-2" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {plans.map((plan) => (
                                            <tr key={plan.id} className="hover:bg-muted/20">
                                                <td className="py-3 font-medium text-foreground">
                                                    {plan.name}
                                                </td>
                                                <td className="py-3 text-right text-foreground">
                                                    {formatCurrency(plan.price_per_month)}
                                                </td>
                                                <td className="py-3 text-right text-muted-foreground">
                                                    {plan.max_clubs}
                                                </td>
                                                <td className="py-3 text-right text-muted-foreground">
                                                    {plan.max_courts_per_club}
                                                </td>
                                                <td className="py-3 text-right text-muted-foreground">
                                                    {plan.max_staff_users}
                                                </td>
                                                <td className="py-3 text-right text-muted-foreground">
                                                    {plan.trial_days}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <button
                                                        onClick={() => onManageClick(plan.id)}
                                                        className="btn-outline px-3 py-1.5 text-xs"
                                                    >
                                                        <ExternalLink size={12} /> Manage
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </section>
            ) : null}
        </div>
    );
}
