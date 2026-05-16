import { useCallback, useState } from "react";
import type { JSX } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useListPlans } from "../../hooks";
import { usePlatformKeyStore } from "../../store/platformKey";
import PlansView from "./PlansView";

export default function PlansContainer(): JSX.Element {
    const navigate = useNavigate();
    const { platformKey, isSet, set } = usePlatformKeyStore();
    const [platformKeyInput, setPlatformKeyInput] = useState("");

    const { data, isLoading, error, refetch } = useListPlans(isSet ? platformKey : "");

    const handleSetPlatformKey = useCallback(() => {
        const trimmed = platformKeyInput.trim();
        if (trimmed) set(trimmed);
    }, [platformKeyInput, set]);

    const handleRefresh = useCallback(() => void refetch(), [refetch]);

    const handleCreateClick = useCallback(
        () => void navigate({ to: "/plans/new" as never }),
        [navigate]
    );

    const handleManageClick = useCallback(
        (planId: string) =>
            void navigate({ to: "/plans/$planId" as never, params: { planId } as never }),
        [navigate]
    );

    return (
        <PlansView
            platformKey={platformKey}
            isPlatformKeySet={isSet}
            platformKeyInput={platformKeyInput}
            plans={data ?? []}
            isLoading={isLoading}
            error={error?.message ?? null}
            onPlatformKeyInputChange={setPlatformKeyInput}
            onSetPlatformKey={handleSetPlatformKey}
            onRefresh={handleRefresh}
            onCreateClick={handleCreateClick}
            onManageClick={handleManageClick}
        />
    );
}
