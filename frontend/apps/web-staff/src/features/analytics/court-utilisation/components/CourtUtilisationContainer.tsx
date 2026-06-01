import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import { useClubCourtsUtilisation } from "../../hooks";
import { useClubAccess } from "../../store";
import type { ClubCourtsUtilisation } from "@repo/staff-domain/models";
import type { DateRange } from "../../types";
import { formatShortDate } from "../../club-utilisation/utilisationConstants";
import { computeCourtComparison, type CourtSortKey } from "../courtComparison";
import CourtUtilisationView from "./CourtUtilisationView";

function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function defaultRange(): DateRange {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1);
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - 30);
    return { from: formatLocalDate(fromDate), to: formatLocalDate(toDate) };
}

function currentMonthRange(): DateRange {
    const today = new Date();
    const toDate = new Date(today);
    toDate.setDate(today.getDate() - 1);
    const fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    return clampRangeToYesterday({
        from: formatLocalDate(fromDate),
        to: formatLocalDate(toDate),
    });
}

function clampRangeToYesterday(next: DateRange): DateRange {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() - 1);
    const max = formatLocalDate(maxDate);
    const to = next.to > max ? max : next.to;
    const from = next.from > max ? max : next.from;
    return { from, to: to < from ? from : to };
}

export default function CourtUtilisationContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [range, setRange] = useState<DateRange>(() => defaultRange());
    const [sortKey, setSortKey] = useState<CourtSortKey>("utilisation");

    const { data, isLoading, error, refetch } = useClubCourtsUtilisation(clubId ?? "", {
        dateFrom: range.from,
        dateTo: range.to,
    });

    const courts = useMemo(() => (data as ClubCourtsUtilisation | undefined)?.courts ?? [], [data]);
    const summary = useMemo(() => computeCourtComparison(courts, sortKey), [courts, sortKey]);

    const rangeLabel = useMemo(
        () =>
            range.from === range.to
                ? formatShortDate(range.from)
                : `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`,
        [range]
    );

    const handleRefresh = useCallback(() => void refetch(), [refetch]);
    const handleRangeChange = useCallback((next: DateRange) => {
        setRange(clampRangeToYesterday(next));
    }, []);
    const handleCurrentMonth = useCallback(() => {
        setRange(currentMonthRange());
    }, []);

    return (
        <CourtUtilisationView
            range={range}
            rangeLabel={rangeLabel}
            summary={summary}
            sortKey={sortKey}
            courtCount={courts.length}
            isLoading={isLoading}
            error={(error as Error | null) ?? null}
            onRangeChange={handleRangeChange}
            onSortChange={setSortKey}
            onCurrentMonth={handleCurrentMonth}
            onRefresh={handleRefresh}
        />
    );
}
