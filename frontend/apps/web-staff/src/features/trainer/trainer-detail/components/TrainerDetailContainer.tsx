import type { JSX } from "react";
import { useCallback, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useGetTrainerAvailability, useGetTrainerBookings, useListTrainers } from "../../hooks";
import { useClubAccess, canManageTrainers } from "../../store";
import type { Trainer, TrainerTab } from "../../types";
import TrainerDetailView from "./TrainerDetailView";
import CreateAvailabilityModal from "./CreateAvailabilityModal";

export default function TrainerDetailContainer(): JSX.Element {
    const { trainerId } = useParams({ strict: false }) as { trainerId: string };
    const { clubId, role } = useClubAccess();
    const canManage = canManageTrainers(role);

    const [activeTab, setActiveTab] = useState<TrainerTab>("availability");
    const [showCreateAvailability, setShowCreateAvailability] = useState(false);

    const { data: trainers = [], isLoading: trainersLoading } = useListTrainers(clubId ?? "");

    const trainer = (trainers as Trainer[]).find((t) => t.id === trainerId);

    const {
        data: availability = [],
        isLoading: availabilityLoading,
        error: availabilityError,
        refetch: refetchAvailability,
    } = useGetTrainerAvailability(trainerId);

    const {
        data: bookings = [],
        isLoading: bookingsLoading,
        error: bookingsError,
        refetch: refetchBookings,
    } = useGetTrainerBookings(trainerId, true);

    const handleRefreshAvailability = useCallback((): void => {
        void refetchAvailability();
    }, [refetchAvailability]);

    const handleRefreshBookings = useCallback((): void => {
        void refetchBookings();
    }, [refetchBookings]);

    const handleCreateAvailability = useCallback((): void => {
        setShowCreateAvailability(true);
    }, []);

    const handleAvailabilityCreated = useCallback((): void => {
        void refetchAvailability();
    }, [refetchAvailability]);

    if (trainersLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-32">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
        );
    }

    if (!trainer) {
        return (
            <div className="flex items-center justify-center py-32">
                <p className="text-sm text-muted-foreground">Trainer not found.</p>
            </div>
        );
    }

    return (
        <>
            <TrainerDetailView
                trainer={trainer}
                availability={availability}
                availabilityLoading={availabilityLoading}
                availabilityError={availabilityError as Error | null}
                bookings={bookings}
                bookingsLoading={bookingsLoading}
                bookingsError={bookingsError as Error | null}
                canManage={canManage}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onRefreshAvailability={handleRefreshAvailability}
                onRefreshBookings={handleRefreshBookings}
                onCreateAvailability={handleCreateAvailability}
            />
            {showCreateAvailability && clubId ? (
                <CreateAvailabilityModal
                    trainerId={trainerId}
                    clubId={clubId}
                    onClose={() => setShowCreateAvailability(false)}
                    onSuccess={handleAvailabilityCreated}
                />
            ) : null}
        </>
    );
}
