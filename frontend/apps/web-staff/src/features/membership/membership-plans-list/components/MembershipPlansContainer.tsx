import { useListMembershipPlans } from "../../hooks";
import { useClubAccess } from "../../store";
import type { MembershipPlan } from "../../types";
import { AlertToast } from "@repo/ui";
import type { JSX } from "react";
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import MembershipPlansView from "./MembershipPlansView";

export default function MembershipPlansContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as { created?: boolean; updated?: boolean };
    const [successMsg, setSuccessMsg] = useState(
        search.created === true
            ? "Membership plan created successfully."
            : search.updated === true
              ? "Membership plan updated successfully."
              : ""
    );

    useEffect(() => {
        if (search.created === true || search.updated === true) {
            void navigate({
                to: "/membership-plans",
                search: { created: undefined, updated: undefined },
                replace: true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { clubId, role } = useClubAccess();
    const canManagePlans = role === "owner" || role === "admin";

    const { data: plans = [], isLoading, error, refetch } = useListMembershipPlans(clubId ?? "");

    const handleCreateClick = useCallback((): void => {
        if (!canManagePlans) return;
        void navigate({ to: "/membership-plans/new" });
    }, [canManagePlans, navigate]);

    const handleEditPlan = useCallback(
        (plan: MembershipPlan): void => {
            void navigate({ to: "/membership-plans/$planId", params: { planId: plan.id } });
        },
        [navigate]
    );

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    return (
        <>
            <MembershipPlansView
                plans={plans as MembershipPlan[]}
                isLoading={isLoading}
                error={error as Error | null}
                canManagePlans={canManagePlans}
                onCreateClick={handleCreateClick}
                onEditPlan={handleEditPlan}
                onRefresh={handleRefresh}
            />
            {successMsg ? (
                <AlertToast
                    title={successMsg}
                    variant="success"
                    onClose={() => setSuccessMsg("")}
                />
            ) : null}
        </>
    );
}
