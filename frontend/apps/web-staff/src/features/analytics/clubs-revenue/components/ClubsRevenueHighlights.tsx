import type { JSX } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { ClubsRevenueSummary } from "../clubsRevenueSummary";

type Props = {
    summary: ClubsRevenueSummary;
};

type HighlightCardProps = {
    tone: "success" | "destructive";
    eyebrow: string;
    clubName: string;
    sharePct: number;
    amountLabel: string;
    amountValue: string;
    icon: JSX.Element;
};

function HighlightCard({
    tone,
    eyebrow,
    clubName,
    sharePct,
    amountLabel,
    amountValue,
    icon,
}: HighlightCardProps): JSX.Element {
    const palette =
        tone === "success"
            ? {
                  border: "border-success/30",
                  bg: "bg-success/[0.07]",
                  iconBg: "bg-success text-success-foreground",
                  eyebrow: "text-success",
                  amount: "text-success",
              }
            : {
                  border: "border-destructive/30",
                  bg: "bg-destructive/[0.07]",
                  iconBg: "bg-destructive text-destructive-foreground",
                  eyebrow: "text-destructive",
                  amount: "text-destructive",
              };

    return (
        <div
            className={`flex items-center gap-4 rounded-2xl border ${palette.border} ${palette.bg} px-5 py-4`}
        >
            <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${palette.iconBg}`}
            >
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-bold uppercase tracking-wide ${palette.eyebrow}`}>
                    {eyebrow}
                </p>
                <p className="truncate text-base font-semibold tracking-tight text-foreground">
                    {clubName} — {sharePct.toFixed(1)}% share
                </p>
            </div>
            <p className={`shrink-0 whitespace-nowrap text-sm font-semibold ${palette.amount}`}>
                {amountValue} {amountLabel}
            </p>
        </div>
    );
}

/**
 * Top performer / needs-attention callout derived from the sorted summary rows.
 * Rows are already ranked by net revenue descending, so the first is the leader
 * and the last is the laggard. Hidden when fewer than two clubs exist (no
 * meaningful comparison to draw).
 */
export function ClubsRevenueHighlights({ summary }: Props): JSX.Element | null {
    if (summary.rows.length < 2) return null;

    const top = summary.rows[0];
    const low = summary.rows[summary.rows.length - 1];
    if (!top || !low) return null;

    return (
        <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-2">
            <HighlightCard
                tone="success"
                eyebrow="Top Performer"
                clubName={top.clubName}
                sharePct={top.sharePct}
                amountLabel="earned"
                amountValue={formatCurrency(top.netAmount)}
                icon={<ArrowUpRight size={22} />}
            />
            <HighlightCard
                tone="destructive"
                eyebrow="Needs Attention"
                clubName={low.clubName}
                sharePct={low.sharePct}
                amountLabel="net revenue"
                amountValue={formatCurrency(low.netAmount)}
                icon={<ArrowDownRight size={22} />}
            />
        </div>
    );
}
