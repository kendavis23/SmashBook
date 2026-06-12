import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import { useCoachPopularityLeaderboard } from "../../hooks";
import { useClubAccess } from "../../store";
import type { CoachSort } from "../../types";
import { TABLE_PAGE_SIZE } from "../coachPopularityConstants";
import { computeCoachPopularitySummary } from "../coachPopularitySummary";
import CoachPopularityView from "./CoachPopularityView";

export default function CoachPopularityContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [sort, setSort] = useState<CoachSort>("sessions");
    const [page, setPage] = useState(0);

    const offset = page * TABLE_PAGE_SIZE;

    const value = useCoachPopularityLeaderboard(clubId ?? "", {
        sort,
        limit: TABLE_PAGE_SIZE,
        offset,
    });
    const topSessions = useCoachPopularityLeaderboard(clubId ?? "", {
        sort: "sessions",
        limit: 5,
        offset: 0,
    });
    const topReturnRate = useCoachPopularityLeaderboard(clubId ?? "", {
        sort: "return_rate",
        limit: 5,
        offset: 0,
    });
    const topRecentlyActive = useCoachPopularityLeaderboard(clubId ?? "", {
        sort: "last_session_at",
        limit: 5,
        offset: 0,
    });

    const summary = useMemo(() => computeCoachPopularitySummary(value.data), [value.data]);

    const totalItems = value.data?.total_records ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / TABLE_PAGE_SIZE));

    const handleRefresh = useCallback(() => {
        void value.refetch();
        void topSessions.refetch();
        void topReturnRate.refetch();
        void topRecentlyActive.refetch();
    }, [topRecentlyActive, topReturnRate, topSessions, value]);

    const handleSortChange = useCallback((nextSort: CoachSort) => {
        setSort(nextSort);
        setPage(0);
    }, []);

    return (
        <CoachPopularityView
            summary={summary}
            value={value.data}
            topSessions={topSessions.data}
            topReturnRate={topReturnRate.data}
            topRecentlyActive={topRecentlyActive.data}
            sort={sort}
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            isLoading={value.isLoading}
            error={
                ((value.error ??
                    topSessions.error ??
                    topReturnRate.error ??
                    topRecentlyActive.error) as Error | null) ?? null
            }
            onSortChange={handleSortChange}
            onPageChange={setPage}
            onRefresh={handleRefresh}
        />
    );
}
