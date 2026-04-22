import { useState, useCallback, useEffect } from "react";
import type { JSX } from "react";
import { AlertToast } from "@repo/ui";
import { useGetCalendarView, useListCourts } from "../hooks";
import { useClubAccess } from "../store";
import type { CalendarViewMode, NewSlotContext } from "../types";
import { todayIso, getWeekStart, getWeekEnd, addDays } from "../types";
import CalendarView from "./CalendarView";
import { ManageBookingModal } from "../../booking/manage-booking/components/ManageBookingModal";
import { ManageReservationModal } from "../../reservation/manage-reservation/components/ManageReservationModal";
import { NewCalendarSlotModal } from "./NewCalendarSlotModal";

export default function CalendarContainer(): JSX.Element {
    const { clubId } = useClubAccess();
    const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
    const [anchorDate, setAnchorDate] = useState<string>(todayIso);
    const [selectedCourtId, setSelectedCourtId] = useState<string>("");
    const [manageBookingId, setManageBookingId] = useState<string | null>(null);
    const [manageReservationId, setManageReservationId] = useState<string | null>(null);
    const [newSlotContext, setNewSlotContext] = useState<NewSlotContext | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const dateFrom = viewMode === "week" ? getWeekStart(anchorDate) : anchorDate;
    const dateTo = viewMode === "week" ? getWeekEnd(anchorDate) : anchorDate;

    const { data, isLoading, error, refetch } = useGetCalendarView(clubId ?? "", {
        view: viewMode,
        anchor_date: anchorDate,
    });

    const { data: courts = [] } = useListCourts(clubId ?? "");

    useEffect(() => {
        if (courts.length > 0 && !selectedCourtId) {
            setSelectedCourtId((courts[0] as { id: string }).id);
        }
    }, [courts, selectedCourtId]);

    const handlePrev = useCallback((): void => {
        setAnchorDate((prev) => addDays(prev, viewMode === "week" ? -7 : -1));
    }, [viewMode]);

    const handleNext = useCallback((): void => {
        setAnchorDate((prev) => addDays(prev, viewMode === "week" ? 7 : 1));
    }, [viewMode]);

    const handleToday = useCallback((): void => {
        setAnchorDate(todayIso());
    }, []);

    const handleViewModeChange = useCallback((mode: CalendarViewMode): void => {
        setViewMode(mode);
    }, []);

    const handleRefresh = useCallback((): void => {
        void refetch();
    }, [refetch]);

    const handleManageClick = useCallback((bookingId: string): void => {
        setManageBookingId(bookingId);
    }, []);

    const handleManageReservationClick = useCallback((reservationId: string): void => {
        setManageReservationId(reservationId);
    }, []);

    const handleNewSlotClick = useCallback(
        (
            courtId: string,
            courtName: string,
            date: string,
            startTime: string,
            endTime: string
        ): void => {
            setNewSlotContext({ courtId, courtName, date, startTime, endTime });
        },
        []
    );

    return (
        <>
            {successMsg ? (
                <AlertToast
                    title={successMsg}
                    variant="success"
                    onClose={() => setSuccessMsg(null)}
                />
            ) : null}
            {manageBookingId ? (
                <ManageBookingModal
                    bookingId={manageBookingId}
                    onClose={() => setManageBookingId(null)}
                    onSuccess={() => {
                        setManageBookingId(null);
                        setSuccessMsg("Booking updated.");
                        void refetch();
                    }}
                />
            ) : null}
            {manageReservationId ? (
                <ManageReservationModal
                    reservationId={manageReservationId}
                    onClose={() => setManageReservationId(null)}
                    onSuccess={() => {
                        setManageReservationId(null);
                        setSuccessMsg("Reservation updated.");
                        void refetch();
                    }}
                />
            ) : null}
            {newSlotContext ? (
                <NewCalendarSlotModal
                    context={newSlotContext}
                    onClose={() => setNewSlotContext(null)}
                    onSuccess={() => {
                        setNewSlotContext(null);
                        setSuccessMsg("Created successfully.");
                        void refetch();
                    }}
                />
            ) : null}
            <CalendarView
                calendarData={data ?? null}
                isLoading={isLoading}
                error={error as Error | null}
                viewMode={viewMode}
                anchorDate={anchorDate}
                dateFrom={dateFrom}
                dateTo={dateTo}
                courts={courts as { id: string; name: string }[]}
                selectedCourtId={selectedCourtId}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onViewModeChange={handleViewModeChange}
                onRefresh={handleRefresh}
                onCourtChange={setSelectedCourtId}
                onManageClick={handleManageClick}
                onManageReservationClick={handleManageReservationClick}
                onNewSlotClick={handleNewSlotClick}
            />
        </>
    );
}
