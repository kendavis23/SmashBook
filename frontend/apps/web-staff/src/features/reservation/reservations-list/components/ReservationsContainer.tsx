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

type ReservationsSearch = {
    created?: boolean;
    deleted?: boolean;
    reservationType?: string;
    courtId?: string;
    fromDt?: string;
    toDt?: string;
};

type ReservationsRouteSearch = {
    created: boolean | undefined;
    deleted: boolean | undefined;
    reservationType: string | undefined;
    courtId: string | undefined;
    fromDt: string | undefined;
    toDt: string | undefined;
};

function buildReservationsSearch(
    filters: ReservationFilters,
    flags: Pick<ReservationsSearch, "created" | "deleted"> = {}
): ReservationsRouteSearch {
    return {
        created: flags.created,
        deleted: flags.deleted,
        reservationType: filters.reservationType || undefined,
        courtId: filters.courtId || undefined,
        fromDt: filters.fromDt || undefined,
        toDt: filters.toDt || undefined,
    };
}

export default function ReservationsContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as ReservationsSearch;
    const [successToast, setSuccessToast] = useState(
        search.created ? "Reservation created." : search.deleted ? "Reservation deleted." : ""
    );

    const filtersFromUrl: ReservationFilters = {
        reservationType: search.reservationType ?? "",
        courtId: search.courtId ?? "",
        fromDt: search.fromDt ?? todayUTCStart(),
        toDt: search.toDt ?? "",
    };

    const [filters, setFilters] = useState<ReservationFilters>(filtersFromUrl);
    const [appliedFilters, setAppliedFilters] = useState<ReservationFilters>(filtersFromUrl);

    useEffect(() => {
        if (search.created || search.deleted) {
            void navigate({
                to: "/reservations",
                search: buildReservationsSearch(appliedFilters),
                replace: true,
            });
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
        void navigate({
            to: "/reservations",
            search: buildReservationsSearch(filters),
            replace: true,
        });
    }, [filters, navigate]);

    const handleCreateClick = useCallback((): void => {
        if (!canCreate) return;
        void navigate({ to: "/reservations/new" });
    }, [canCreate, navigate]);

    const handleManageClick = useCallback(
        (reservationId: string): void => {
            void navigate({
                to: "/reservations/$reservationId",
                params: { reservationId },
                search: {
                    reservationType: appliedFilters.reservationType || undefined,
                    courtId: appliedFilters.courtId || undefined,
                    fromDt: appliedFilters.fromDt || undefined,
                    toDt: appliedFilters.toDt || undefined,
                },
            });
        },
        [navigate, appliedFilters]
    );

    const [refreshKey, setRefreshKey] = useState(0);

    const handleRefresh = useCallback((): void => {
        setRefreshKey((k) => k + 1);
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
                refreshKey={refreshKey}
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
