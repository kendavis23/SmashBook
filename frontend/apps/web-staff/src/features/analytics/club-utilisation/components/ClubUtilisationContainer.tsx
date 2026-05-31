import type { JSX } from "react";
import { useMemo, useState, useCallback } from "react";
import { useClubDailyUtilisation } from "../../hooks";
import { useClubAccess } from "../../store";
import type { ClubDailyUtilisation, DateRange } from "../../types";
import { computeUtilisationSummary } from "../utilisationSummary";
import { formatShortDate } from "../utilisationConstants";
import ClubUtilisationView from "./ClubUtilisationView";

function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function defaultRange(): DateRange {
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - 6);
    return {
        from: formatLocalDate(fromDate),
        to: formatLocalDate(toDate),
    };
}

export default function ClubUtilisationContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [range, setRange] = useState<DateRange>(() => defaultRange());

    const { data, isLoading, error, refetch } = useClubDailyUtilisation(clubId ?? "", {
        dateFrom: range.from,
        dateTo: range.to,
    });

    const points = useMemo(() => (data as ClubDailyUtilisation | undefined)?.points ?? [], [data]);
    const summary = useMemo(() => computeUtilisationSummary(points), [points]);

    const rangeLabel = useMemo(
        () =>
            range.from === range.to
                ? formatShortDate(range.from)
                : `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`,
        [range]
    );

    const handleRefresh = useCallback(() => void refetch(), [refetch]);

    return (
        <ClubUtilisationView
            range={range}
            rangeLabel={rangeLabel}
            points={points}
            summary={summary}
            isLoading={isLoading}
            error={(error as Error | null) ?? null}
            onRangeChange={setRange}
            onRefresh={handleRefresh}
        />
    );
}
