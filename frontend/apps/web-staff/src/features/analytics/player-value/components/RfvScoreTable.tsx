import type { JSX } from "react";
import { Pagination } from "@repo/ui";
import type { PlayerValueRow } from "../../types";
import { rfvSegment, SEGMENT_STYLE, scoreColour } from "../rfvSegment";
import { PlayerCell } from "./PlayerCell";

type Props = {
    rows: PlayerValueRow[];
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
};

const thBase =
    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right";
const tdBase = "px-4 py-3 text-sm tabular-nums text-right";
const divider = "border-r border-border/70";

function ScoreCell({ score }: { score: number | null }): JSX.Element {
    return <span className={`font-semibold ${scoreColour(score)}`}>{score ?? "—"}</span>;
}

function RfvCellBadge({
    r,
    f,
    v,
}: {
    r: number | null;
    f: number | null;
    v: number | null;
}): JSX.Element {
    if (r === null || f === null || v === null) {
        return <span className="text-muted-foreground">—</span>;
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground">
            <span className={scoreColour(r)}>{r}</span>
            <span className={scoreColour(f)}>{f}</span>
            <span className={scoreColour(v)}>{v}</span>
        </span>
    );
}

function SegmentBadge({ row }: { row: PlayerValueRow }): JSX.Element {
    const seg = rfvSegment(row);
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ${SEGMENT_STYLE[seg]}`}
        >
            {seg}
        </span>
    );
}

export function RfvScoreTable({
    rows,
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
}: Props): JSX.Element {
    const pageRows = rows;
    const rowOffset = page * pageSize;

    if (rows.length === 0) {
        return (
            <p className="py-16 text-center text-sm text-muted-foreground">
                No RFV scores available yet — scores refresh nightly.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] border-collapse">
                    <thead>
                        <tr className="border-b border-border/70">
                            <th className="w-10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-left">
                                #
                            </th>
                            <th className={`${thBase} ${divider} text-left`}>Player</th>
                            <th className={`${thBase}`}>
                                Recency Score
                                <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                                    (0–5)
                                </span>
                            </th>
                            <th className={`${thBase}`}>
                                Frequency Score
                                <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                                    (0–5)
                                </span>
                            </th>
                            <th className={`${thBase} ${divider}`}>
                                Value Score
                                <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                                    (0–5)
                                </span>
                            </th>
                            <th className={`${thBase}`}>
                                RFV Total
                                <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                                    (0–15)
                                </span>
                            </th>
                            <th className={`${thBase} ${divider}`}>
                                RFV Cell
                                <span className="block text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
                                    (R F V)
                                </span>
                            </th>
                            <th className={`${thBase} text-left`}>Segment</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((row, idx) => (
                            <tr
                                key={row.user_id}
                                className="group border-b border-border/40 transition-colors last:border-b-0 hover:bg-muted/30"
                            >
                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                    {rowOffset + idx + 1}
                                </td>
                                <td className={`${tdBase} ${divider} text-left`}>
                                    <PlayerCell row={row} />
                                </td>
                                <td className={`${tdBase}`}>
                                    <ScoreCell score={row.recency_score} />
                                </td>
                                <td className={`${tdBase}`}>
                                    <ScoreCell score={row.frequency_score} />
                                </td>
                                <td className={`${tdBase} ${divider}`}>
                                    <ScoreCell score={row.value_score} />
                                </td>
                                <td className={`${tdBase}`}>
                                    {row.rfv_total !== null ? (
                                        <span className="font-semibold">{row.rfv_total}</span>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </td>
                                <td className={`${tdBase} ${divider}`}>
                                    <RfvCellBadge
                                        r={row.recency_score}
                                        f={row.frequency_score}
                                        v={row.value_score}
                                    />
                                </td>
                                <td className={`${tdBase} text-left`}>
                                    <SegmentBadge row={row} />
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
