import type { JSX } from "react";
import { useMemo, useState, useCallback } from "react";
import type { RevenueBasis } from "../../types";
import type { DateRange } from "../../types";
import { useTenantRevenueComparison } from "../../hooks";
import ClubsRevenueView from "./ClubsRevenueView";

function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Default range = last 30 calendar days, ending yesterday (today's data is incomplete). */
function defaultRange(): DateRange {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - 1);
    const fromDate = new Date(toDate);
    fromDate.setDate(toDate.getDate() - 29);
    return { from: formatLocalDate(fromDate), to: formatLocalDate(toDate) };
}

export default function ClubsRevenueContainer(): JSX.Element {
    const [range, setRange] = useState<DateRange>(() => defaultRange());
    const [basis, setBasis] = useState<RevenueBasis>("service");

    const params = useMemo(
        () => ({ basis, dateFrom: range.from, dateTo: range.to }),
        [basis, range]
    );

    const { data, isLoading, error, refetch } = useTenantRevenueComparison(params);

    const handleRefresh = useCallback(() => {
        void refetch();
    }, [refetch]);

    return (
        <ClubsRevenueView
            range={range}
            data={data}
            basis={basis}
            isLoading={isLoading}
            error={(error as Error | null) ?? null}
            onRangeChange={setRange}
            onBasisChange={setBasis}
            onRefresh={handleRefresh}
        />
    );
}
