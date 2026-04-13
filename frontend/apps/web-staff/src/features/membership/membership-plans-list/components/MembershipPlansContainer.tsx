import { useListMembershipPlans } from "../../hooks";
import { useClubAccess } from "../../store";
import type { MembershipPlan } from "../../types";
import { AlertToast } from "@repo/ui";
import type { JSX } from "react";
import { useState, useCallback } from "react";
import { MembershipPlanModal } from "../../components/MembershipPlanModal";
import MembershipPlansView from "./MembershipPlansView";

export default function MembershipPlansContainer(): JSX.Element {
    const [modalPlan, setModalPlan] = useState<MembershipPlan | null | "create">(null);
    const [successMsg, setSuccessMsg] = useState("");

    const { clubId, role } = useClubAccess();
    const canManagePlans = role === "owner" || role === "admin";

    const { data: plans = [], isLoading, error } = useListMembershipPlans(clubId ?? "");

    const handleCreateClick = useCallback((): void => {
        if (!canManagePlans) return;
        setModalPlan("create");
    }, [canManagePlans]);

    const handleEditPlan = useCallback((plan: MembershipPlan): void => {
        setModalPlan(plan);
    }, []);

    const handleCloseModal = useCallback((): void => {
        setModalPlan(null);
    }, []);

    const modalOpen = modalPlan !== null;
    const editPlan = modalPlan !== "create" && modalPlan !== null ? modalPlan : undefined;

    return (
        <>
            <MembershipPlansView
                plans={plans as MembershipPlan[]}
                isLoading={isLoading}
                error={error as Error | null}
                canManagePlans={canManagePlans}
                onCreateClick={handleCreateClick}
                onEditPlan={handleEditPlan}
            />
            {successMsg ? (
                <AlertToast
                    title={successMsg}
                    variant="success"
                    onClose={() => setSuccessMsg("")}
                />
            ) : null}
            {modalOpen && canManagePlans ? (
                <MembershipPlanModal
                    clubId={clubId ?? ""}
                    onClose={handleCloseModal}
                    onSuccess={setSuccessMsg}
                    initialData={editPlan}
                />
            ) : null}
        </>
    );
}
