import type { JSX } from "react";
import { useCallback } from "react";
import { useGetSubscription } from "../../hooks";
import MySubscriptionView from "./MySubscriptionView";
import type { Subscription } from "../../types";

export default function MySubscriptionContainer(): JSX.Element {
    const { data, isLoading, error, refetch } = useGetSubscription();

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    return (
        <MySubscriptionView
            subscription={(data as Subscription) ?? null}
            isLoading={isLoading}
            error={error as Error | null}
            onRefresh={handleRefresh}
        />
    );
}
