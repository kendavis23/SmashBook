import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import { useActivePlayersKpi, useActivePlayersTimeseries, useSignupsTimeseries } from "../../hooks";
import { useClubAccess } from "../../store";
import type { DateRange, FlowGranularity } from "../../types";
import { DEFAULT_RANGE_DAYS } from "../playerActivityConstants";
import { computePlayerActivitySummary } from "../playerActivitySummary";
import PlayerActivityView from "./PlayerActivityView";

function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
}

/** Default range: the last 30 calendar days, ending yesterday (today is partial). */
function defaultRange(): DateRange {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1); // yesterday — today's data is incomplete
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - (DEFAULT_RANGE_DAYS - 1)); // 30 days inclusive
    return { from: formatLocalDate(fromDate), to: formatLocalDate(toDate) };
}

export default function PlayerActivityContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [range, setRange] = useState<DateRange>(() => defaultRange());
    const [granularity, setGranularity] = useState<FlowGranularity>("day");

    const id = clubId ?? "";

    const kpiParams = useMemo((): { as_of: string; window_days: number } => {
        const from = new Date(range.from);
        const to = new Date(range.to);
        const diffMs = to.getTime() - from.getTime();
        const window_days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
        return { as_of: range.to, window_days };
    }, [range]);

    const kpi = useActivePlayersKpi(id, kpiParams);
    const activeSeries = useActivePlayersTimeseries(id, {
        granularity,
        date_from: range.from,
        date_to: range.to,
    });
    const signupsSeries = useSignupsTimeseries(id, {
        granularity,
        date_from: range.from,
        date_to: range.to,
    });

    const summary = useMemo(
        () => computePlayerActivitySummary(kpi.data, activeSeries.data, signupsSeries.data),
        [kpi.data, activeSeries.data, signupsSeries.data]
    );

    const isLoading = kpi.isLoading || activeSeries.isLoading || signupsSeries.isLoading;
    const error =
        (kpi.error as Error | null) ??
        (activeSeries.error as Error | null) ??
        (signupsSeries.error as Error | null) ??
        null;

    const handleRefresh = useCallback(() => {
        void kpi.refetch();
        void activeSeries.refetch();
        void signupsSeries.refetch();
    }, [kpi, activeSeries, signupsSeries]);

    return (
        <PlayerActivityView
            range={range}
            granularity={granularity}
            summary={summary}
            activeSeries={activeSeries.data}
            signupsSeries={signupsSeries.data}
            isLoading={isLoading}
            error={error}
            onRangeChange={setRange}
            onGranularityChange={setGranularity}
            onRefresh={handleRefresh}
        />
    );
}
