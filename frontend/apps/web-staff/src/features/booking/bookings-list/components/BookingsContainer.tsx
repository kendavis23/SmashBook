import { useState, useCallback, useMemo, useEffect } from "react";
import type { JSX } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertToast } from "@repo/ui";
import { useListBookings, useListCourts } from "../../hooks";
import { useClubAccess, canManageBooking } from "../../store";
import type { Booking, BookingsListFilters } from "../../types";
import BookingsView from "./BookingsView";

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

type BookingsSearch = {
    created?: boolean;
    cancelled?: boolean;
    dateFrom?: string;
    dateTo?: string;
    bookingType?: string;
    bookingStatus?: string;
    courtId?: string;
    playerSearch?: string;
};

type BookingsRouteSearch = {
    created: boolean | undefined;
    cancelled: boolean | undefined;
    dateFrom: string | undefined;
    dateTo: string | undefined;
    bookingType: string | undefined;
    bookingStatus: string | undefined;
    courtId: string | undefined;
    playerSearch: string | undefined;
};

function buildBookingsSearch(
    filters: BookingsListFilters,
    flags: Pick<BookingsSearch, "created" | "cancelled"> = {}
): BookingsRouteSearch {
    return {
        created: flags.created,
        cancelled: flags.cancelled,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        bookingType: filters.bookingType || undefined,
        bookingStatus: filters.bookingStatus || undefined,
        courtId: filters.courtId || undefined,
        playerSearch: filters.playerSearch || undefined,
    };
}

export default function BookingsContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as BookingsSearch;

    const [successMessage, setSuccessMessage] = useState<string>(
        search.created === true
            ? "Booking created successfully."
            : search.cancelled === true
              ? "Booking cancelled successfully."
              : ""
    );

    const filtersFromUrl: BookingsListFilters = {
        dateFrom: search.dateFrom ?? todayIso(),
        dateTo: search.dateTo ?? "",
        bookingType: search.bookingType ?? "",
        bookingStatus: search.bookingStatus ?? "",
        courtId: search.courtId ?? "",
        playerSearch: search.playerSearch ?? "",
    };

    const [filters, setFilters] = useState<BookingsListFilters>(filtersFromUrl);
    const [appliedFilters, setAppliedFilters] = useState<BookingsListFilters>(filtersFromUrl);

    useEffect(() => {
        if (search.created === true || search.cancelled === true) {
            void navigate({
                to: "/bookings",
                search: buildBookingsSearch(appliedFilters),
                replace: true,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { clubId, role } = useClubAccess();
    const canManage = useMemo(() => canManageBooking(role), [role]);

    const {
        data: bookings = [],
        isLoading,
        error,
        refetch,
    } = useListBookings(clubId ?? "", {
        date_from: appliedFilters.dateFrom || undefined,
        date_to: appliedFilters.dateTo || undefined,
        booking_type: (appliedFilters.bookingType as Booking["booking_type"]) || undefined,
        booking_status: (appliedFilters.bookingStatus as Booking["status"]) || undefined,
        court_id: appliedFilters.courtId || undefined,
        player_search: appliedFilters.playerSearch || undefined,
    });

    const { data: courts = [] } = useListCourts(clubId ?? "");

    const courtNameMap = useMemo((): Record<string, string> => {
        const map: Record<string, string> = {};
        (courts as { id: string; name: string }[]).forEach((c) => {
            map[c.id] = c.name;
        });
        return map;
    }, [courts]);

    const handleSearch = useCallback((): void => {
        setAppliedFilters({ ...filters });
        void navigate({
            to: "/bookings",
            search: buildBookingsSearch(filters),
            replace: true,
        });
    }, [filters, navigate]);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const handleCreateClick = useCallback((): void => {
        void navigate({
            to: "/bookings/new",
            search: { courtId: undefined, date: undefined, startTime: undefined },
        });
    }, [navigate]);

    const handleManageClick = useCallback(
        (bookingId: string): void => {
            void navigate({
                to: "/bookings/$bookingId",
                params: { bookingId },
                search: {
                    dateFrom: appliedFilters.dateFrom || undefined,
                    dateTo: appliedFilters.dateTo || undefined,
                    bookingType: appliedFilters.bookingType || undefined,
                    bookingStatus: appliedFilters.bookingStatus || undefined,
                    courtId: appliedFilters.courtId || undefined,
                    playerSearch: appliedFilters.playerSearch || undefined,
                },
            });
        },
        [navigate, appliedFilters]
    );

    return (
        <>
            <BookingsView
                bookings={bookings as Booking[]}
                isLoading={isLoading}
                error={error as Error | null}
                canManage={canManage}
                filters={filters}
                courts={courts as { id: string; name: string }[]}
                courtNameMap={courtNameMap}
                onFiltersChange={setFilters}
                onSearch={handleSearch}
                onRefresh={handleRefresh}
                onCreateClick={handleCreateClick}
                onManageClick={handleManageClick}
            />
            {successMessage ? (
                <AlertToast
                    title={successMessage}
                    variant="success"
                    onClose={() => setSuccessMessage("")}
                />
            ) : null}
        </>
    );
}
