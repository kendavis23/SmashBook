import { useCallback } from "react";
import type { JSX } from "react";
import { useNavigate } from "@tanstack/react-router";

import { useListTenants } from "../../hooks";
import { usePlatformKeyStore } from "../../../plan/store/platformKey";
import TenantsView from "./TenantsView";

export default function TenantsContainer(): JSX.Element {
    const navigate = useNavigate();
    const { platformKey, isSet } = usePlatformKeyStore();

    const { data, isLoading, error, refetch } = useListTenants(isSet ? platformKey : "");

    const handleRefresh = useCallback(() => void refetch(), [refetch]);

    const handleManageClick = useCallback(
        (tenantId: string) =>
            void navigate({ to: "/tenants/$tenantId" as never, params: { tenantId } as never }),
        [navigate]
    );

    return (
        <TenantsView
            tenants={data ?? []}
            isLoading={isLoading}
            error={error?.message ?? null}
            onRefresh={handleRefresh}
            onManageClick={handleManageClick}
        />
    );
}
