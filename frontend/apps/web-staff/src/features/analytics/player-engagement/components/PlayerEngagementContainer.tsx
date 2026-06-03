import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import { useMostActivePlayers, useInactiveMembers } from "../../hooks";
import { useClubAccess } from "../../store";
import type { EngagementTab, EngagementWindowDays } from "../playerEngagementConstants";
import { MOST_ACTIVE_WINDOW_DAYS, TABLE_LIMIT } from "../playerEngagementConstants";
import { computePlayerEngagementSummary } from "../playerEngagementSummary";
import PlayerEngagementView from "./PlayerEngagementView";

export default function PlayerEngagementContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [tab, setTab] = useState<EngagementTab>("most-active");
    const [windowDays, setWindowDays] = useState<EngagementWindowDays>(MOST_ACTIVE_WINDOW_DAYS);

    const mostActive = useMostActivePlayers(clubId ?? "", {
        window_days: windowDays,
        limit: TABLE_LIMIT,
        offset: 0,
    });
    const inactive = useInactiveMembers(clubId ?? "", {
        inactive_days: windowDays,
        limit: TABLE_LIMIT,
        offset: 0,
    });

    const summary = useMemo(
        () => computePlayerEngagementSummary(mostActive.data, inactive.data, windowDays),
        [mostActive.data, inactive.data, windowDays]
    );

    const isLoading = mostActive.isLoading || inactive.isLoading;
    const error = (mostActive.error as Error | null) ?? (inactive.error as Error | null) ?? null;

    const handleRefresh = useCallback(() => {
        void mostActive.refetch();
        void inactive.refetch();
    }, [mostActive, inactive]);

    return (
        <PlayerEngagementView
            summary={summary}
            mostActive={mostActive.data}
            inactive={inactive.data}
            tab={tab}
            windowDays={windowDays}
            isLoading={isLoading}
            error={error}
            onTabChange={setTab}
            onWindowDaysChange={setWindowDays}
            onRefresh={handleRefresh}
        />
    );
}
