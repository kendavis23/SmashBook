import type { JSX } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@repo/ui";
import type { PlayerValueRow } from "../../types";
import type { EngagementTab } from "../playerEngagementConstants";
import {
    formatPlayedDate,
    relativePlayedLabel,
    daysSince,
    thBase,
    tdBase,
} from "../playerEngagementConstants";
import { EngagementPlayerCell, MembershipBadge } from "./EngagementPlayerCell";

const PAGE_SIZE = 10;

type Props = {
    tab: EngagementTab;
    rows: PlayerValueRow[];
};

export function EngagementDetailTable({ tab, rows }: Props): JSX.Element {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(rows.length / PAGE_SIZE);

    useEffect(() => setPage(0), [rows, tab]);

    const pageRows = useMemo(
        () => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
        [rows, page]
    );

    if (rows.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-muted-foreground">
                No players match this report.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] border-collapse">
                    <thead>
                        <tr className="border-b border-border/70">
                            <th className={`${thBase} w-10 text-left`}>#</th>
                            <th className={`${thBase} text-left`}>Player</th>
                            <th className={`${thBase} text-left`}>Membership Plan</th>
                            <th className={`${thBase} text-left`}>First Played</th>
                            <th className={`${thBase} text-left`}>Last Played</th>
                            {tab === "inactive" ? (
                                <th className={`${thBase} text-right`}>Days Inactive</th>
                            ) : null}
                            <th className={`${thBase} text-right`}>Bookings (30d)</th>
                            <th className={`${thBase} text-right`}>Bookings (90d)</th>
                            <th className={`${thBase} text-right`}>Bookings (All Time)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row, idx) => {
                            const inactiveDays = daysSince(row.last_played_at);
                            return (
                                <tr
                                    key={row.user_id}
                                    className="border-b border-border/40 transition-colors hover:bg-muted/30"
                                >
                                    <td className={`${tdBase} text-muted-foreground`}>
                                        {page * PAGE_SIZE + idx + 1}
                                    </td>
                                    <td className={`${tdBase} text-left`}>
                                        <EngagementPlayerCell row={row} withEmail />
                                    </td>
                                    <td className={`${tdBase} text-left`}>
                                        <MembershipBadge planName={row.membership_plan_name} />
                                    </td>
                                    <td className={`${tdBase} text-left text-muted-foreground`}>
                                        {formatPlayedDate(row.first_played_at)}
                                    </td>
                                    <td className={`${tdBase} text-left`}>
                                        <span className="block text-foreground">
                                            {formatPlayedDate(row.last_played_at)}
                                        </span>
                                        <span className="block text-xs text-muted-foreground">
                                            {relativePlayedLabel(row.last_played_at)}
                                        </span>
                                    </td>
                                    {tab === "inactive" ? (
                                        <td
                                            className={`${tdBase} text-right font-semibold text-destructive`}
                                        >
                                            {inactiveDays === null
                                                ? "—"
                                                : `${inactiveDays.toLocaleString()} days`}
                                        </td>
                                    ) : null}
                                    <td className={`${tdBase} text-right`}>
                                        {row.played_last_30d.toLocaleString()}
                                    </td>
                                    <td className={`${tdBase} text-right`}>
                                        {row.played_last_90d.toLocaleString()}
                                    </td>
                                    <td className={`${tdBase} text-right`}>
                                        {row.bookings_played.toLocaleString()}
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
                totalItems={rows.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />
        </div>
    );
}
