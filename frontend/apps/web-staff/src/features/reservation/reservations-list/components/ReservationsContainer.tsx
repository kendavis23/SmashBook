import { useState, useCallback, useMemo } from "react";
import type { JSX } from "react";
import {
    useListCalendarReservations,
    useDeleteCalendarReservation,
    useListCourts,
} from "../../hooks";
import { useClubAccess } from "../../store";
import type { CalendarReservation, Court, ReservationFilters } from "../../types";
import { AlertToast } from "@repo/ui";
import ReservationsView from "./ReservationsView";
import ReservationModal from "./ReservationModal";

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
        if (filters.fromDt) {
            const from = new Date(filters.fromDt);
            if (new Date(res.start_datetime) < from) {
                return false;
            }
        }
        if (filters.toDt) {
            const to = new Date(filters.toDt);
            if (new Date(res.end_datetime) > to) {
                return false;
            }
        }
        return true;
    });
}

export default function ReservationsContainer(): JSX.Element {
    const [filters, setFilters] = useState<ReservationFilters>(createDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<ReservationFilters>(createDefaultFilters);
    const [modalReservation, setModalReservation] = useState<CalendarReservation | null | "create">(
        null
    );
    const [successMsg, setSuccessMsg] = useState("");

    const { clubId, role } = useClubAccess();
    const canCreate = role === "owner" || role === "admin";

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

    const deleteMutation = useDeleteCalendarReservation(clubId ?? "");

    const filteredReservations = applyClientFilters(
        allReservations as CalendarReservation[],
        appliedFilters
    );

    const handleSearch = useCallback((): void => {
        setAppliedFilters({ ...filters });
    }, [filters]);

    const handleCreateClick = useCallback((): void => {
        if (!canCreate) return;
        setModalReservation("create");
    }, [canCreate]);

    const handleEditReservation = useCallback((reservation: CalendarReservation): void => {
        setModalReservation(reservation);
    }, []);

    const handleDeleteReservation = useCallback(
        (reservation: CalendarReservation): void => {
            deleteMutation.mutate(reservation.id, {
                onSuccess: () => {
                    setSuccessMsg("Reservation deleted.");
                },
            });
        },
        [deleteMutation]
    );

    const handleCloseModal = useCallback((): void => {
        setModalReservation(null);
    }, []);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const modalOpen = modalReservation !== null;
    const editReservation =
        modalReservation !== "create" && modalReservation !== null ? modalReservation : undefined;

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
                onEditReservation={handleEditReservation}
                onDeleteReservation={handleDeleteReservation}
                onRefresh={handleRefresh}
                isDeleting={deleteMutation.isPending}
            />

            {successMsg ? (
                <AlertToast
                    title={successMsg}
                    variant="success"
                    onClose={() => setSuccessMsg("")}
                />
            ) : null}

            {modalOpen ? (
                <ReservationModal
                    clubId={clubId ?? ""}
                    courts={courts as Court[]}
                    onClose={handleCloseModal}
                    onSuccess={setSuccessMsg}
                    initialData={editReservation}
                />
            ) : null}
        </>
    );
}
