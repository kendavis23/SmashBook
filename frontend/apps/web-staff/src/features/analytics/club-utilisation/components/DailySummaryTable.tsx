import type { JSX, ReactNode } from "react";
import { formatCurrency } from "@repo/ui";
import type { DailyUtilisationPoint, UtilisationSummary } from "../../types";
import { formatShortDate, formatWeekday, utilisationTone } from "../utilisationConstants";

type Props = {
    points: DailyUtilisationPoint[];
    summary: UtilisationSummary;
};

const TONE_BADGE: Record<ReturnType<typeof utilisationTone>, string> = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    muted: "bg-muted text-muted-foreground",
};

function UtilisationBadge({ pct, hasSlots }: { pct: number; hasSlots: boolean }): JSX.Element {
    if (!hasSlots) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }
    const tone = utilisationTone(pct);
    return (
        <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_BADGE[tone]}`}
        >
            {Math.round(pct)}%
        </span>
    );
}

/** Per-day breakdown table with a Total / Avg column. Scrolls horizontally on small screens. */
export function DailySummaryTable({ points, summary }: Props): JSX.Element {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                    <tr className="border-b border-border text-left">
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Date
                        </th>
                        {points.map((p) => (
                            <th
                                key={p.snapshot_date}
                                className="px-3 py-2.5 text-center text-xs font-semibold text-foreground"
                            >
                                <div>{formatShortDate(p.snapshot_date)}</div>
                                <div className="font-normal text-muted-foreground">
                                    {formatWeekday(p.snapshot_date)}
                                </div>
                            </th>
                        ))}
                        <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Total / Avg
                        </th>
                    </tr>
                </thead>
                <tbody className="text-foreground">
                    <Row label="Total Slots">
                        {points.map((p) => (
                            <Cell key={p.snapshot_date}>{p.total_slots.toLocaleString()}</Cell>
                        ))}
                        <TotalCell>{summary.totalSlots.toLocaleString()}</TotalCell>
                    </Row>
                    <Row label="Booked Slots">
                        {points.map((p) => (
                            <Cell key={p.snapshot_date}>{p.booked_slots.toLocaleString()}</Cell>
                        ))}
                        <TotalCell>{summary.bookedSlots.toLocaleString()}</TotalCell>
                    </Row>
                    <Row label="Utilisation (%)">
                        {points.map((p) => (
                            <Cell key={p.snapshot_date}>
                                <UtilisationBadge
                                    pct={Number(p.utilisation_pct)}
                                    hasSlots={p.total_slots > 0}
                                />
                            </Cell>
                        ))}
                        <TotalCell>
                            {summary.totalSlots > 0
                                ? `${summary.avgUtilisationPct.toFixed(1)}%`
                                : "—"}
                        </TotalCell>
                    </Row>
                    <Row label="Actual Revenue">
                        {points.map((p) => (
                            <Cell key={p.snapshot_date}>{formatCurrency(p.revenue_actual)}</Cell>
                        ))}
                        <TotalCell>{formatCurrency(summary.revenueActual)}</TotalCell>
                    </Row>
                    <Row label="Potential Revenue">
                        {points.map((p) => (
                            <Cell key={p.snapshot_date}>{formatCurrency(p.revenue_potential)}</Cell>
                        ))}
                        <TotalCell>{formatCurrency(summary.revenuePotential)}</TotalCell>
                    </Row>
                </tbody>
            </table>
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
    return (
        <tr className="border-b border-border/60 last:border-0">
            <td className="px-3 py-2.5 font-medium text-muted-foreground">{label}</td>
            {children}
        </tr>
    );
}

function Cell({ children }: { children: ReactNode }): JSX.Element {
    return <td className="px-3 py-2.5 text-center">{children}</td>;
}

function TotalCell({ children }: { children: ReactNode }): JSX.Element {
    return <td className="px-3 py-2.5 text-center font-semibold text-cta">{children}</td>;
}
