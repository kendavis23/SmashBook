import type { JSX } from "react";
import { useMemo, useState, useCallback } from "react";
import type { Granularity, RevenueBasis } from "@repo/staff-domain/models";
import { useClubRevenueByType, useClubRevenueSummary, useClubRevenueTimeseries } from "../../hooks";
import { useClubAccess } from "../../store";
import type { DateRange } from "../../types";
import RevenueView from "./RevenueView";

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
    fromDate.setDate(toDate.getDate() - 90);
    return {
        from: formatLocalDate(fromDate),
        to: formatLocalDate(toDate),
    };
}

/** Inclusive day count between two "YYYY-MM-DD" dates. */
function dayCount(range: DateRange): number {
    const from = Date.parse(`${range.from}T00:00:00Z`);
    const to = Date.parse(`${range.to}T00:00:00Z`);
    if (Number.isNaN(from) || Number.isNaN(to)) return 1;
    return Math.floor((to - from) / 86_400_000) + 1;
}

export default function RevenueContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [range, setRange] = useState<DateRange>(() => defaultRange());
    const [granularity, setGranularity] = useState<Granularity>("week");
    const [basis, setBasis] = useState<RevenueBasis>("service");

    const params = useMemo(
        () => ({ basis, dateFrom: range.from, dateTo: range.to }),
        [basis, range]
    );

    // A short range can't sensibly bucket by coarser grains; disable those toggles.
    const days = dayCount(range);
    const disabledGranularities = useMemo<Granularity[]>(() => {
        const out: Granularity[] = [];
        if (days < 7) out.push("week");
        if (days < 28) out.push("month");
        return out;
    }, [days]);

    // If the active grain becomes invalid after a range change, fall back to "day".
    const effectiveGranularity = disabledGranularities.includes(granularity) ? "day" : granularity;

    const {
        data: summaryData,
        isLoading: isSummaryLoading,
        error: summaryError,
        refetch: refetchSummary,
    } = useClubRevenueSummary(clubId ?? "", params);

    const {
        data: timeseriesData,
        isLoading: isTimeseriesLoading,
        error: timeseriesError,
        refetch: refetchTimeseries,
    } = useClubRevenueTimeseries(clubId ?? "", { ...params, granularity: effectiveGranularity });

    const {
        data: byTypeData,
        isLoading: isByTypeLoading,
        error: byTypeError,
        refetch: refetchByType,
    } = useClubRevenueByType(clubId ?? "", params);

    const handleRefresh = useCallback(() => {
        void refetchSummary();
        void refetchTimeseries();
        void refetchByType();
    }, [refetchSummary, refetchTimeseries, refetchByType]);

    return (
        <RevenueView
            range={range}
            summaryData={summaryData}
            timeseriesData={timeseriesData}
            byTypeData={byTypeData}
            granularity={effectiveGranularity}
            disabledGranularities={disabledGranularities}
            basis={basis}
            isSummaryLoading={isSummaryLoading}
            isTimeseriesLoading={isTimeseriesLoading}
            isByTypeLoading={isByTypeLoading}
            summaryError={(summaryError as Error | null) ?? null}
            timeseriesError={(timeseriesError as Error | null) ?? null}
            byTypeError={(byTypeError as Error | null) ?? null}
            onRangeChange={setRange}
            onGranularityChange={setGranularity}
            onBasisChange={setBasis}
            onRefresh={handleRefresh}
        />
    );
}
