import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertToast } from "@repo/ui";
import { useGetTrainerAvailability, useListTrainers } from "../../hooks";
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
    const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
    const {
        data: availability = [],
        isLoading: availabilityLoading,
        error: availabilityError,
        refetch: refetchAvailability,
    } = useGetTrainerAvailability(selectedTrainer?.id ?? "");

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

    useEffect(() => {
        if (trainers.length === 0) {
            setSelectedTrainer(null);
            return;
        }

        setSelectedTrainer((current) => {
            if (current && trainers.some((trainer) => trainer.id === current.id)) {
                return current;
            }

            return (trainers as Trainer[])[0] ?? null;
        });
    }, [trainers]);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const handleRefreshAvailability = useCallback((): void => {
        void refetchAvailability();
    }, [refetchAvailability]);

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
                selectedTrainer={selectedTrainer}
                availability={availability}
                availabilityLoading={availabilityLoading}
                availabilityError={availabilityError as Error | null}
                onRefresh={handleRefresh}
                onRefreshAvailability={handleRefreshAvailability}
                onSelectTrainer={setSelectedTrainer}
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
