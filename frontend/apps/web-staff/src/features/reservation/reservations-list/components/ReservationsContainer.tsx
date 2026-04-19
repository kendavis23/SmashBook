import { useState, useCallback, useMemo, useEffect } from "react";
import type { JSX } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertToast } from "@repo/ui";
import { useListCalendarReservations, useListCourts } from "../../hooks";
import { useClubAccess, canManageReservation } from "../../store";
import type { CalendarReservation, Court, ReservationFilters } from "../../types";
import ReservationsView from "./ReservationsView";

function createDefaultFilters(): ReservationFilters {
    return {
        reservationType: "",
        courtId: "",
        fromDt: "",
        toDt: "",
    };
}

function applyClientFilters(
    reservations: CalendarReservation[],
    filters: ReservationFilters
): CalendarReservation[] {
    return reservations.filter((res) => {
        if (filters.reservationType && res.reservation_type !== filters.reservationType) {
            return false;
        }
        if (filters.courtId) {
            if (res.court_id !== filters.courtId) {
                return false;
            }
        }
        if (filters.fromDt && res.start_datetime < filters.fromDt) {
            return false;
        }
        if (filters.toDt && res.end_datetime > filters.toDt) {
            return false;
        }
        return true;
    });
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
        data: allReservations = [],
        isLoading,
        error,
        refetch,
    } = useListCalendarReservations(clubId ?? "");

    const { data: courts = [] } = useListCourts(clubId ?? "");

    const courtNameMap = useMemo((): Record<string, string> => {
        const map: Record<string, string> = {};
        (courts as Court[]).forEach((c) => {
            map[c.id] = c.name;
        });
        return map;
    }, [courts]);

    const filteredReservations = applyClientFilters(
        allReservations as CalendarReservation[],
        appliedFilters
    );

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
                reservations={filteredReservations}
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
