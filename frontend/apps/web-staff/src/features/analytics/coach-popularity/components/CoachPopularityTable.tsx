import type { JSX } from "react";
import { formatCurrency, Pagination } from "@repo/ui";
import type { CoachPopularityRow } from "../../types";
import {
    avatarTone,
    coachDisplayName,
    coachInitials,
    formatReturnRate,
    formatSessionDate,
    relativeSessionLabel,
    tdBase,
    thBase,
} from "../coachPopularityConstants";

type Props = {
    rows: CoachPopularityRow[];
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
};

const groupDivider = "border-r border-border/70";
const stickyCoachHeader =
    "md:sticky md:left-0 md:z-20 md:bg-card md:shadow-[1px_0_0_hsl(var(--border))]";
const stickyCoachCell =
    "md:sticky md:left-0 md:z-10 md:bg-card md:shadow-[1px_0_0_hsl(var(--border))]";
const dateCell = `${tdBase} min-w-[8.75rem]`;
const dateHeader = `${thBase} min-w-[8.75rem]`;

function CoachCell({ row }: { row: CoachPopularityRow }): JSX.Element {
    const name = coachDisplayName(row.coach_name);
    return (
        <span className="flex items-center gap-2.5">
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${avatarTone(
                    row.staff_profile_id
                )}`}
                aria-hidden
            >
                {coachInitials(row.coach_name)}
            </span>
            <span className="min-w-0">
                <span className="block truncate font-medium leading-5 text-foreground">{name}</span>
                {row.is_active === false ? (
                    <span className="block truncate text-xs leading-4 text-muted-foreground">
                        Inactive
                    </span>
                ) : null}
            </span>
        </span>
    );
}

export function CoachPopularityTable({
    rows,
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
}: Props): JSX.Element {
    const rowOffset = page * pageSize;

    if (rows.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-muted-foreground">
                No coaches match this report.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[64rem] border-collapse">
                    <thead>
                        <tr className="border-b border-border/70">
                            <th className={`${thBase} w-10 text-left`}>#</th>
                            <th
                                className={`${thBase} ${stickyCoachHeader} ${groupDivider} text-left`}
                            >
                                Coach
                            </th>
                            <th className={`${thBase} text-right`}>Sessions</th>
                            <th className={`${thBase} text-right`}>Sessions (30d)</th>
                            <th className={`${thBase} ${groupDivider} text-right`}>
                                Sessions (90d)
                            </th>
                            <th className={`${thBase} text-right`}>Distinct Players</th>
                            <th className={`${thBase} text-right`}>Repeat Players</th>
                            <th className={`${thBase} ${groupDivider} text-right`}>Return Rate</th>
                            <th className={`${dateHeader} ${groupDivider} text-left`}>
                                Last Session
                            </th>
                            <th className={`${thBase} text-right`}>Lesson Revenue</th>
                            <th className={`${thBase} text-left`}>Currency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr
                                key={row.staff_profile_id}
                                className="group border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/30"
                            >
                                <td className={`${tdBase} text-muted-foreground`}>
                                    {rowOffset + idx + 1}
                                </td>
                                <td
                                    className={`${tdBase} ${stickyCoachCell} ${groupDivider} text-left`}
                                >
                                    <CoachCell row={row} />
                                </td>
                                <td className={`${tdBase} text-right`}>
                                    {row.sessions.toLocaleString()}
                                </td>
                                <td className={`${tdBase} text-right`}>
                                    {row.sessions_last_30d.toLocaleString()}
                                </td>
                                <td className={`${tdBase} ${groupDivider} text-right`}>
                                    {row.sessions_last_90d.toLocaleString()}
                                </td>
                                <td className={`${tdBase} text-right`}>
                                    {row.distinct_players.toLocaleString()}
                                </td>
                                <td className={`${tdBase} text-right`}>
                                    {row.repeat_players.toLocaleString()}
                                </td>
                                <td
                                    className={`${tdBase} ${groupDivider} text-right font-semibold`}
                                >
                                    {formatReturnRate(row.return_rate)}
                                </td>
                                <td className={`${dateCell} ${groupDivider} text-left`}>
                                    <span className="block leading-5 text-foreground">
                                        {formatSessionDate(row.last_session_at)}
                                    </span>
                                    <span className="block text-xs leading-4 text-muted-foreground">
                                        {relativeSessionLabel(row.last_session_at)}
                                    </span>
                                </td>
                                <td className={`${tdBase} text-right font-semibold text-success`}>
                                    {formatCurrency(row.lesson_revenue)}
                                </td>
                                <td className={`${tdBase} text-left text-muted-foreground`}>
                                    {row.currency ?? "—"}
                                </td>
                            </tr>
                        ))}
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
