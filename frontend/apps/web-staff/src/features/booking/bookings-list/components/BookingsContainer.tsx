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

function createDefaultFilters(): BookingsListFilters {
    return {
        dateFrom: todayIso(),
        dateTo: "",
        bookingType: "",
        bookingStatus: "",
        courtId: "",
        playerSearch: "",
    };
}

export default function BookingsContainer(): JSX.Element {
    const navigate = useNavigate();
    const search = useSearch({ strict: false }) as { created?: boolean; cancelled?: boolean };
    const [successMessage, setSuccessMessage] = useState<string>(
        search.created === true
            ? "Booking created successfully."
            : search.cancelled === true
              ? "Booking cancelled successfully."
              : ""
    );
    const [filters, setFilters] = useState<BookingsListFilters>(createDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<BookingsListFilters>(createDefaultFilters);

    useEffect(() => {
        if (search.created === true || search.cancelled === true) {
            void navigate({ to: "/bookings", search: {}, replace: true });
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
    }, [filters]);

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
            void navigate({ to: "/bookings/$bookingId", params: { bookingId } });
        },
        [navigate]
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
