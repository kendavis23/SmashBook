import { useState, useCallback, useMemo, useEffect } from "react";
import type { JSX } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertToast } from "@repo/ui";
import { useListCalendarReservations, useListCourts } from "../../hooks";
import { useClubAccess, canManageReservation } from "../../store";
import type { CalendarReservation, Court, ReservationFilters } from "../../types";
import ReservationsView from "./ReservationsView";

function todayUTCStart(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}T00:00`;
}

function createDefaultFilters(): ReservationFilters {
    return {
        reservationType: "",
        courtId: "",
        fromDt: todayUTCStart(),
        toDt: "",
    };
}

export default function ReservationsContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as { created?: boolean; deleted?: boolean };
    const [successToast, setSuccessToast] = useState(
        search.created ? "Reservation created." : search.deleted ? "Reservation deleted." : ""
    );
    const [filters, setFilters] = useState<ReservationFilters>(createDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<ReservationFilters>(createDefaultFilters);

    useEffect(() => {
        if (search.created || search.deleted) {
            void navigate({ to: "/reservations", search: {}, replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { clubId, role } = useClubAccess();
    const canCreate = canManageReservation(role);

    const {
        data: reservations = [],
        isLoading,
        error,
        refetch,
    } = useListCalendarReservations(clubId ?? "", {
        reservationType: appliedFilters.reservationType || undefined,
        courtId: appliedFilters.courtId || undefined,
        fromDt: appliedFilters.fromDt || undefined,
        toDt: appliedFilters.toDt || undefined,
    });

    const { data: courts = [] } = useListCourts(clubId ?? "");

    const courtNameMap = useMemo((): Record<string, string> => {
        const map: Record<string, string> = {};
        (courts as Court[]).forEach((c) => {
            map[c.id] = c.name;
        });
        return map;
    }, [courts]);

    const handleSearch = useCallback((): void => {
        setAppliedFilters({ ...filters });
    }, [filters]);

    const handleCreateClick = useCallback((): void => {
        if (!canCreate) return;
        void navigate({ to: "/reservations/new" });
    }, [canCreate, navigate]);

    const handleManageClick = useCallback(
        (reservationId: string): void => {
            void navigate({ to: "/reservations/$reservationId", params: { reservationId } });
        },
        [navigate]
    );

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    return (
        <>
            <ReservationsView
                reservations={reservations as CalendarReservation[]}
                isLoading={isLoading}
                error={error as Error | null}
                canCreate={canCreate}
                filters={filters}
                courts={courts as Court[]}
                courtNameMap={courtNameMap}
                onFiltersChange={setFilters}
                onSearch={handleSearch}
                onCreateClick={handleCreateClick}
                onManageClick={handleManageClick}
                onRefresh={handleRefresh}
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
