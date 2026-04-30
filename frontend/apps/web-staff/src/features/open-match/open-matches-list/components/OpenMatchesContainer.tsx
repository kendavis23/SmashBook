import { useState, useCallback } from "react";
import type { JSX } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useListOpenGames } from "../../hooks";
import { useClubAccess } from "../../store";
import type { OpenGame, OpenMatchListFilters } from "../../types";
import OpenMatchesView from "./OpenMatchesView";

type OpenMatchSearch = {
    date?: string;
    minSkill?: string;
    maxSkill?: string;
};

type OpenMatchRouteSearch = {
    date: string | undefined;
    minSkill: string | undefined;
    maxSkill: string | undefined;
};

function buildOpenMatchSearch(filters: OpenMatchListFilters): OpenMatchRouteSearch {
    return {
        date: filters.date || undefined,
        minSkill: filters.minSkill || undefined,
        maxSkill: filters.maxSkill || undefined,
    };
}

export default function OpenMatchesContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as OpenMatchSearch;

    const filtersFromUrl: OpenMatchListFilters = {
        date: search.date ?? "",
        minSkill: search.minSkill ?? "1",
        maxSkill: search.maxSkill ?? "7",
    };

    const [filters, setFilters] = useState<OpenMatchListFilters>(filtersFromUrl);
    const [appliedFilters, setAppliedFilters] = useState<OpenMatchListFilters>(filtersFromUrl);
    const [refreshKey, setRefreshKey] = useState(0);

    const { clubId } = useClubAccess();

    const {
        data: openGames = [],
        isLoading,
        error,
        refetch,
    } = useListOpenGames(clubId ?? "", {
        date: appliedFilters.date || undefined,
        min_skill: appliedFilters.minSkill ? Number(appliedFilters.minSkill) : undefined,
        max_skill: appliedFilters.maxSkill ? Number(appliedFilters.maxSkill) : undefined,
    });

    const handleSearch = useCallback((): void => {
        setAppliedFilters({ ...filters });
        void navigate({
            to: "/open-match",
            search: buildOpenMatchSearch(filters),
            replace: true,
        });
    }, [filters, navigate]);

    const handleRefresh = useCallback((): void => {
        setRefreshKey((k) => k + 1);
        void refetch();
    }, [refetch]);

    const handleManageClick = useCallback(
        (gameId: string): void => {
            void navigate({
                to: "/open-match/$bookingId",
                params: { bookingId: gameId },
                search: buildOpenMatchSearch(appliedFilters),
            });
        },
        [navigate, appliedFilters]
    );

    return (
        <OpenMatchesView
            openGames={openGames as OpenGame[]}
            isLoading={isLoading}
            error={error as Error | null}
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            onRefresh={handleRefresh}
            onManageClick={handleManageClick}
            refreshKey={refreshKey}
        />
    );
}
