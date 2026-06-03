import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlayerValueLeaderboard } from "../../hooks";
import { useClubAccess } from "../../store";
import type { PlayerSort } from "../../types";
import type { PlayerTab } from "../playerValueConstants";
import { TABLE_LIMIT, TABLE_PAGE_SIZE } from "../playerValueConstants";
import { computePlayerValueSummary } from "../playerValueSummary";
import PlayerValueView from "./PlayerValueView";

export default function PlayerValueContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [tab, setTab] = useState<PlayerTab>("value");
    const [membersOnly, setMembersOnly] = useState(false);
    const [sort, setSort] = useState<PlayerSort>("lifetime_spend");
    const [page, setPage] = useState(0);

    const offset = page * TABLE_PAGE_SIZE;

    const reportParams = {
        members_only: membersOnly,
        sort,
        limit: TABLE_LIMIT,
        offset,
    };

    const value = usePlayerValueLeaderboard(clubId ?? "", reportParams);
    const topLifetimeSpend = usePlayerValueLeaderboard(clubId ?? "", {
        members_only: membersOnly,
        sort: "lifetime_spend",
        limit: 5,
        offset: 0,
    });
    const topBookingsPlayed = usePlayerValueLeaderboard(clubId ?? "", {
        members_only: membersOnly,
        sort: "bookings_played",
        limit: 5,
        offset: 0,
    });
    const topRecentlyPlayed = usePlayerValueLeaderboard(clubId ?? "", {
        members_only: membersOnly,
        sort: "last_played_at",
        limit: 5,
        offset: 0,
    });

    const summary = useMemo(() => computePlayerValueSummary(value.data), [value.data]);

    const rowCount = value.data?.rows.length ?? 0;
    const hasMoreBackendRows = rowCount === TABLE_LIMIT;
    const totalItems = offset + rowCount + (hasMoreBackendRows ? TABLE_PAGE_SIZE : 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / TABLE_PAGE_SIZE));

    const handleRefresh = useCallback(() => {
        void value.refetch();
        void topLifetimeSpend.refetch();
        void topBookingsPlayed.refetch();
        void topRecentlyPlayed.refetch();
    }, [topBookingsPlayed, topLifetimeSpend, topRecentlyPlayed, value]);

    const handleMembersOnlyChange = useCallback((nextMembersOnly: boolean) => {
        setMembersOnly(nextMembersOnly);
        setPage(0);
    }, []);

    const handleSortChange = useCallback((nextSort: PlayerSort) => {
        setSort(nextSort);
        setPage(0);
    }, []);

    useEffect(() => {
        if (!value.isLoading && page > 0 && rowCount === 0) {
            setPage((currentPage) => Math.max(0, currentPage - 1));
        }
    }, [page, rowCount, value.isLoading]);

    return (
        <PlayerValueView
            summary={summary}
            value={value.data}
            topLifetimeSpend={topLifetimeSpend.data}
            topBookingsPlayed={topBookingsPlayed.data}
            topRecentlyPlayed={topRecentlyPlayed.data}
            tab={tab}
            membersOnly={membersOnly}
            sort={sort}
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            isLoading={value.isLoading}
            error={
                ((value.error ??
                    topLifetimeSpend.error ??
                    topBookingsPlayed.error ??
                    topRecentlyPlayed.error) as Error | null) ?? null
            }
            onTabChange={setTab}
            onMembersOnlyChange={handleMembersOnlyChange}
            onSortChange={handleSortChange}
            onPageChange={setPage}
            onRefresh={handleRefresh}
        />
    );
}
