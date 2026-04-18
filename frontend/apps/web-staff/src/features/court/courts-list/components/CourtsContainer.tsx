import { useListCourts, useGetCourtAvailability } from "../../hooks";
import { useClubAccess, canManageCourts } from "../../store";
import type { Court, TimeSlot, AvailabilityFilters } from "../../types";
import type { JSX } from "react";
import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertToast } from "@repo/ui";
import CourtsView from "./CourtsView";

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function createDefaultFilters(): AvailabilityFilters {
    return {
        search: "",
        surfaceType: "",
        date: todayIso(),
        timeFrom: "",
        timeTo: "",
    };
}

function toServerFilters(filters: AvailabilityFilters) {
    return {
        surfaceType: filters.surfaceType,
        date: filters.date,
        timeFrom: filters.timeFrom,
        timeTo: filters.timeTo,
    };
}

function hasSameServerFilters(
    left: ReturnType<typeof toServerFilters>,
    right: ReturnType<typeof toServerFilters>
): boolean {
    return (
        left.surfaceType === right.surfaceType &&
        left.date === right.date &&
        left.timeFrom === right.timeFrom &&
        left.timeTo === right.timeTo
    );
}

export default function CourtsContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as { created?: boolean; updated?: boolean };
    const [successMsg] = useState(
        search.created ? "Court created." : search.updated ? "Court updated." : ""
    );

    const [successToast, setSuccessToast] = useState(successMsg);

    useEffect(() => {
        if (search.created || search.updated) {
            void navigate({
                to: "/courts",
                search: { created: undefined, updated: undefined },
                replace: true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Availability panel state
    const [availabilityCourt, setAvailabilityCourt] = useState<Court | null>(null);
    const [availabilityDate, setAvailabilityDate] = useState(todayIso);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

    // Filter bar state — "pending" are what the user is editing, "applied" drive the API call
    const [filters, setFilters] = useState<AvailabilityFilters>(createDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<AvailabilityFilters>(createDefaultFilters);

    const { clubId, role } = useClubAccess();
    const canManage = canManageCourts(role);

    const {
        data: courts = [],
        isLoading,
        error,
        refetch,
    } = useListCourts(clubId ?? "", {
        surfaceType: appliedFilters.surfaceType,
        date: appliedFilters.date,
        timeFrom: appliedFilters.timeFrom,
        timeTo: appliedFilters.timeTo,
    });

    const {
        data: availability,
        isLoading: availabilityLoading,
        error: availabilityError,
    } = useGetCourtAvailability(availabilityCourt?.id ?? "", availabilityDate);

    const handleSearch = useCallback((): void => {
        const nextServerFilters = toServerFilters(filters);
        const currentServerFilters = toServerFilters(appliedFilters);

        if (hasSameServerFilters(currentServerFilters, nextServerFilters)) {
            void refetch();
            return;
        }

        setAppliedFilters((currentFilters) => ({
            ...currentFilters,
            ...nextServerFilters,
        }));
    }, [appliedFilters, filters, refetch]);

    const handleCreateClick = useCallback((): void => {
        void navigate({ to: "/courts/new" });
    }, [navigate]);

    const handleEditCourt = useCallback(
        (court: Court): void => {
            void navigate({ to: "/courts/$courtId", params: { courtId: court.id } });
        },
        [navigate]
    );

    const handleCheckAvailability = useCallback(
        (court: Court): void => {
            if (availabilityCourt?.id === court.id) {
                setAvailabilityCourt(null);
            } else {
                setAvailabilityCourt(court);
                setSelectedSlot(null);
            }
        },
        [availabilityCourt]
    );

    const handleCloseAvailability = useCallback((): void => {
        setAvailabilityCourt(null);
        setSelectedSlot(null);
    }, []);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const handleBookSlot = useCallback((_slot: TimeSlot): void => {
        // TODO: navigate to booking flow when that feature is built
    }, []);

    const hasPendingServerFilters = !hasSameServerFilters(
        toServerFilters(filters),
        toServerFilters(appliedFilters)
    );
    const hasActiveServerFilters = !hasSameServerFilters(
        toServerFilters(appliedFilters),
        toServerFilters(createDefaultFilters())
    );

    return (
        <>
            <CourtsView
                courts={courts as Court[]}
                isLoading={isLoading}
                error={error as Error | null}
                canCreateCourt={canManage}
                canEditCourt={canManage}
                filters={filters}
                hasPendingServerFilters={hasPendingServerFilters}
                hasActiveServerFilters={hasActiveServerFilters}
                onFiltersChange={setFilters}
                onSearch={handleSearch}
                onCreateClick={handleCreateClick}
                onEditCourt={handleEditCourt}
                onRefresh={handleRefresh}
                availabilityCourt={availabilityCourt}
                availabilityDate={availabilityDate}
                availability={availability}
                availabilityLoading={availabilityLoading}
                availabilityError={availabilityError as Error | null}
                selectedSlot={selectedSlot}
                onCheckAvailability={handleCheckAvailability}
                onCloseAvailability={handleCloseAvailability}
                onAvailabilityDateChange={setAvailabilityDate}
                onSelectSlot={setSelectedSlot}
                onBookSlot={handleBookSlot}
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
