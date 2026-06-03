import type { JSX } from "react";
import { formatCurrency, Pagination } from "@repo/ui";
import type { PlayerValueRow } from "../../types";
import {
    formatPlayedDate,
    relativePlayedLabel,
    TABLE_PAGE_SIZE,
    thBase,
    tdBase,
} from "../playerValueConstants";
import { PlayerCell, MembershipBadge } from "./PlayerCell";

type Props = {
    rows: PlayerValueRow[];
    page: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
};

const groupDivider = "border-r border-border/70";
const stickyPlayerHeader =
    "md:sticky md:left-0 md:z-20 md:bg-card md:shadow-[1px_0_0_hsl(var(--border))]";
const stickyPlayerCell =
    "md:sticky md:left-0 md:z-10 md:bg-card md:shadow-[1px_0_0_hsl(var(--border))]";
const dateCell = `${tdBase} min-w-[8.75rem]`;
const dateHeader = `${thBase} min-w-[8.75rem]`;

/** A signed lifetime-refunds figure, shown red and negative when non-zero. */
function refundCell(amount: number): JSX.Element {
    if (!amount) return <span className="text-muted-foreground">{formatCurrency(0)}</span>;
    return <span className="text-destructive">-{formatCurrency(Math.abs(amount))}</span>;
}

/** The full, paginated detail table for the active leaderboard tab. */
export function PlayerDetailTable({
    rows,
    page,
    totalPages,
    totalItems,
    onPageChange,
}: Props): JSX.Element {
    const pageRows = rows.slice(0, TABLE_PAGE_SIZE);
    const rowOffset = page * TABLE_PAGE_SIZE;

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
                                        <PlayerCell row={row} withEmail />
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
                pageSize={TABLE_PAGE_SIZE}
                onPageChange={onPageChange}
            />
        </div>
    );
}
