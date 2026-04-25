import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertToast } from "@repo/ui";
import { useListTrainers } from "../../hooks";
import { useClubAccess, canManageTrainers } from "../../store";
import type { Trainer } from "../../types";
import TrainersView from "./TrainersView";

export default function TrainersContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as { created?: boolean; updated?: boolean };
    const [successMsg] = useState(
        search.created ? "Trainer created." : search.updated ? "Trainer updated." : ""
    );
    const [successToast, setSuccessToast] = useState(successMsg);

    const { clubId, role } = useClubAccess();
    const canManage = canManageTrainers(role);

    const { data: trainers = [], isLoading, error, refetch } = useListTrainers(clubId ?? "");

    useEffect(() => {
        if (search.created || search.updated) {
            void navigate({
                to: "/trainers",
                search: { created: undefined, updated: undefined },
                replace: true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const handleViewTrainer = useCallback(
        (trainer: Trainer): void => {
            void navigate({ to: "/trainers/$trainerId", params: { trainerId: trainer.id } });
        },
        [navigate]
    );

    return (
        <>
            <TrainersView
                trainers={trainers as Trainer[]}
                isLoading={isLoading}
                error={error as Error | null}
                canManage={canManage}
                onRefresh={handleRefresh}
                onViewTrainer={handleViewTrainer}
            />
            {successToast ? (
                <AlertToast
                    title={successToast}
                    variant="success"
                    onClose={() => setSuccessToast("")}
                />
            ) : null}
        </>
    );
}
