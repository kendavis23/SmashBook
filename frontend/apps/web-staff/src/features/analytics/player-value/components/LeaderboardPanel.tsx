import type { JSX } from "react";
import { Info } from "lucide-react";
import type { PlayerValueRow } from "../../types";
import { panelCls, panelTitleCls, playerDisplayName } from "../playerValueConstants";

/** One metric per row: the formatted display value + the raw value. */
export type MetricCell = { display: string; value: number };

type Props = {
    title: string;
    hint: string;
    /** Column header for the right-hand metric (e.g. "Lifetime Spend"). */
    metricLabel: string;
    rows: PlayerValueRow[];
    /** Maps a row to its metric. */
    metricOf: (row: PlayerValueRow) => MetricCell;
    active?: boolean;
    onViewAll: () => void;
};

/**
 * A compact top-5 leaderboard card: rank, player name, and one metric.
 */
export function LeaderboardPanel({
    title,
    hint,
    metricLabel,
    rows,
    metricOf,
    active = false,
    onViewAll,
}: Props): JSX.Element {
    const cells = rows.map(metricOf);

    return (
        <section
            className={`${panelCls} relative flex flex-col overflow-hidden transition-colors ${
                active ? "border-foreground/20 bg-card shadow-md ring-1 ring-foreground/10" : ""
            }`}
            aria-current={active ? "true" : undefined}
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className={panelTitleCls}>{title}</h3>
                    <span
                        title={hint}
                        aria-label={hint}
                        className="inline-flex text-muted-foreground/70"
                    >
                        <Info size={14} aria-hidden />
                    </span>
                </div>
                <button
                    type="button"
                    onClick={onViewAll}
                    className={
                        active
                            ? "h-7 rounded-md border border-border bg-muted px-2.5 text-xs font-medium text-foreground"
                            : "btn-outline h-7 px-2.5 text-xs"
                    }
                >
                    {active ? "Viewing" : "View all"}
                </button>
            </div>

            {rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                    No players to show.
                </p>
            ) : (
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-border/60">
                            <th className="w-6 pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                #
                            </th>
                            <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Player
                            </th>
                            <th className="w-28 pb-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {metricLabel}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const cell = cells[idx] ?? { display: "—", value: 0 };
                            const name = playerDisplayName(row.full_name, row.email);
                            return (
                                <tr key={row.user_id} className="border-b border-border/30">
                                    <td className="py-2 align-middle text-sm text-muted-foreground">
                                        {idx + 1}
                                    </td>
                                    <td className="min-w-0 py-2 align-middle">
                                        <span className="block truncate text-sm font-medium leading-5 text-foreground">
                                            {name}
                                        </span>
                                    </td>
                                    <td className="py-2 align-middle text-right">
                                        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-foreground">
                                            {cell.display}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </section>
    );
}
