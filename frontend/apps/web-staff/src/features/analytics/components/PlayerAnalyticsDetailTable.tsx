import type { JSX } from "react";
import { formatCurrency, MONTHS_SHORT, Pagination } from "@repo/ui";
import type { PlayerValueRow } from "../types";

type Props = {
    rows: PlayerValueRow[];
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    paginateRows?: boolean;
    onPageChange: (page: number) => void;
};

const thBase = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const tdBase = "px-4 py-3 text-sm tabular-nums text-foreground";
const groupDivider = "border-r border-border/70";
const stickyPlayerHeader =
    "md:sticky md:left-0 md:z-20 md:bg-card md:shadow-[1px_0_0_hsl(var(--border))]";
const stickyPlayerCell =
    "md:sticky md:left-0 md:z-10 md:bg-card md:shadow-[1px_0_0_hsl(var(--border))]";
const dateCell = `${tdBase} min-w-[8.75rem]`;
const dateHeader = `${thBase} min-w-[8.75rem]`;

function formatPlayedDate(value: string | null): string {
    if (!value) return "—";
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d || m < 1 || m > 12) return "—";
    const day = String(d).padStart(2, "0");
    return `${day} ${MONTHS_SHORT[m - 1]} ${y}`;
}

function todayUtcMidnight(): number {
    const now = new Date();
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function daysSince(value: string | null): number | null {
    if (!value) return null;
    const datePart = value.slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    const then = Date.UTC(y, m - 1, d);
    const diff = Math.floor((todayUtcMidnight() - then) / 86_400_000);
    return diff < 0 ? 0 : diff;
}

function relativePlayedLabel(value: string | null): string {
    const days = daysSince(value);
    if (days === null) return "—";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}

function playerDisplayName(fullName: string | null, email: string | null): string {
    const trimmed = fullName?.trim();
    if (trimmed) return trimmed;
    if (email) return email;
    return "Unknown player";
}

function playerInitials(fullName: string | null, email: string | null): string {
    const source = (fullName?.trim() || email || "?").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0];
    if (!first) return "?";
    const last = parts[parts.length - 1];
    if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
    return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

const AVATAR_TONES = [
    "bg-cta/15 text-cta",
    "bg-success/15 text-success",
    "bg-info/15 text-info",
    "bg-warning/15 text-warning",
    "bg-secondary text-secondary-foreground",
] as const;

function avatarTone(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length] ?? AVATAR_TONES[0];
}

function PlayerCell({ row }: { row: PlayerValueRow }): JSX.Element {
    const name = playerDisplayName(row.full_name, row.email);
    return (
        <span className="flex items-center gap-2.5">
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(
                    row.user_id
                )}`}
                aria-hidden
            >
                {playerInitials(row.full_name, row.email)}
            </span>
            <span className="min-w-0">
                <span className="block truncate font-medium leading-5 text-foreground">{name}</span>
                {row.email ? (
                    <span className="block truncate text-xs leading-4 text-muted-foreground">
                        {row.email}
                    </span>
                ) : null}
            </span>
        </span>
    );
}

function MembershipBadge({ planName }: { planName: string | null }): JSX.Element {
    if (!planName) {
        return (
            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium leading-5 text-muted-foreground">
                No plan
            </span>
        );
    }
    return (
        <span className="inline-flex rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium leading-5 text-success">
            {planName}
        </span>
    );
}

function refundCell(amount: number): JSX.Element {
    if (!amount) return <span className="text-muted-foreground">{formatCurrency(0)}</span>;
    return <span className="text-destructive">-{formatCurrency(Math.abs(amount))}</span>;
}

export function PlayerAnalyticsDetailTable({
    rows,
    page,
    totalPages,
    totalItems,
    pageSize,
    paginateRows = false,
    onPageChange,
}: Props): JSX.Element {
    const pageRows = paginateRows
        ? rows.slice(page * pageSize, (page + 1) * pageSize)
        : rows.slice(0, pageSize);
    const rowOffset = page * pageSize;

    if (rows.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-muted-foreground">
                No players match this report.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[76rem] border-collapse">
                    <thead>
                        <tr className="border-b border-border/70">
                            <th className={`${thBase} w-10 text-left`}>#</th>
                            <th className={`${thBase} ${stickyPlayerHeader} text-left`}>Player</th>
                            <th className={`${thBase} ${groupDivider} text-left`}>
                                Membership Plan
                            </th>
                            <th className={`${dateHeader} text-left`}>First Played</th>
                            <th className={`${dateHeader} ${groupDivider} text-left`}>
                                Last Played
                            </th>
                            <th className={`${thBase} text-right`}>Bookings (All Time)</th>
                            <th className={`${thBase} text-right`}>Bookings (30d)</th>
                            <th className={`${thBase} ${groupDivider} text-right`}>
                                Bookings (90d)
                            </th>
                            <th className={`${thBase} text-right`}>Lifetime Gross</th>
                            <th className={`${thBase} text-right`}>Lifetime Refunds</th>
                            <th className={`${thBase} text-right`}>Lifetime Spend</th>
                            <th className={`${thBase} text-right`}>Payments</th>
                            <th className={`${thBase} text-left`}>Currency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row, idx) => {
                            return (
                                <tr
                                    key={row.user_id}
                                    className="group border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/30"
                                >
                                    <td className={`${tdBase} text-muted-foreground`}>
                                        {rowOffset + idx + 1}
                                    </td>
                                    <td className={`${tdBase} ${stickyPlayerCell} text-left`}>
                                        <PlayerCell row={row} />
                                    </td>
                                    <td className={`${tdBase} ${groupDivider} text-left`}>
                                        <MembershipBadge planName={row.membership_plan_name} />
                                    </td>
                                    <td className={`${dateCell} text-left text-muted-foreground`}>
                                        {formatPlayedDate(row.first_played_at)}
                                    </td>
                                    <td className={`${dateCell} ${groupDivider} text-left`}>
                                        <span className="block leading-5 text-foreground">
                                            {formatPlayedDate(row.last_played_at)}
                                        </span>
                                        <span className="block text-xs leading-4 text-muted-foreground">
                                            {relativePlayedLabel(row.last_played_at)}
                                        </span>
                                    </td>
                                    <td className={`${tdBase} text-right`}>
                                        {row.bookings_played.toLocaleString()}
                                    </td>
                                    <td className={`${tdBase} text-right`}>
                                        {row.played_last_30d.toLocaleString()}
                                    </td>
                                    <td className={`${tdBase} ${groupDivider} text-right`}>
                                        {row.played_last_90d.toLocaleString()}
                                    </td>
                                    <td className={`${tdBase} text-right`}>
                                        {formatCurrency(row.lifetime_gross)}
                                    </td>
                                    <td className={`${tdBase} text-right`}>
                                        {refundCell(row.lifetime_refunds)}
                                    </td>
                                    <td
                                        className={`${tdBase} text-right font-semibold text-success`}
                                    >
                                        {formatCurrency(row.lifetime_spend)}
                                    </td>
                                    <td className={`${tdBase} text-right`}>
                                        {row.payments_count.toLocaleString()}
                                    </td>
                                    <td className={`${tdBase} text-left text-muted-foreground`}>
                                        {row.currency ?? "—"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />
        </div>
    );
}
