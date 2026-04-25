import { useCallback } from "react";
import type { JSX } from "react";
import { useMyMatchHistory } from "../../hooks";
import MyGamesView from "./MyGamesView";

export default function MyGamesContainer(): JSX.Element {
    const { data, isLoading, error, refetch } = useMyMatchHistory();

    const handleRefresh = useCallback(() => void refetch(), [refetch]);

    return (
        <MyGamesView
            games={data ?? []}
            isLoading={isLoading}
            error={error}
            onRefresh={handleRefresh}
        />
    );
}
