import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import { usePlayerValueByGroup } from "../../hooks";
import { useClubAccess } from "../../store";
import type { GroupDimension, GroupValueReport } from "../../types";
import {
    DEFAULT_DIMENSION,
    DEFAULT_INACTIVE_DAYS,
    MAX_INACTIVE_DAYS,
    MIN_INACTIVE_DAYS,
} from "../playerSegmentsConstants";
import { computeSegmentSummary } from "../playerSegmentsSummary";
import PlayerSegmentsView from "./PlayerSegmentsView";

function clampInactiveDays(days: number): number {
    if (!Number.isFinite(days)) return DEFAULT_INACTIVE_DAYS;
    return Math.min(MAX_INACTIVE_DAYS, Math.max(MIN_INACTIVE_DAYS, Math.trunc(days)));
}

export default function PlayerSegmentsContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [dimension, setDimension] = useState<GroupDimension>(DEFAULT_DIMENSION);
    const [inactiveDays, setInactiveDays] = useState<number>(DEFAULT_INACTIVE_DAYS);

    const queryParams = useMemo(
        () => ({
            dimension,
            ...(dimension === "activity_status" ? { inactive_days: inactiveDays } : {}),
        }),
        [dimension, inactiveDays]
    );

    const { data, isLoading, error, refetch } = usePlayerValueByGroup(clubId ?? "", queryParams);

    const summary = useMemo(
        () => computeSegmentSummary(data as GroupValueReport | undefined),
        [data]
    );

    const handleRefresh = useCallback(() => void refetch(), [refetch]);

    return (
        <PlayerSegmentsView
            summary={summary}
            dimension={dimension}
            inactiveDays={inactiveDays}
            isLoading={isLoading}
            error={(error as Error | null) ?? null}
            onDimensionChange={setDimension}
            onInactiveDaysChange={(days) => setInactiveDays(clampInactiveDays(days))}
            onRefresh={handleRefresh}
        />
    );
}
