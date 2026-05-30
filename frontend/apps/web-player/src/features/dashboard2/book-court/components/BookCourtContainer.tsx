import { useNavigate, useSearch } from "@tanstack/react-router";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useGetClubAvailability, useJoinBooking, useMyProfile } from "../../hooks";
import { useClubAccess } from "../../store";
import type { ClubAvailabilitySlot } from "../../types";
import type { ClubAvailabilityParams, PlayerBookingItem } from "@repo/player-domain/models";
import type { Booking } from "@repo/player-domain/models";
import { NewBookingModal } from "../../../booking/new-booking/components/NewBookingModal";
import { PaymentModal } from "../../../payment";
import BookCourtView from "./BookCourtView";

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

type BookCourtSearch = {
    date?: string;
    surface?: string;
    from?: string;
    to?: string;
};

type BookingModal = { courtId: string; courtName: string; date: string; startTime: string } | null;

export default function BookCourtContainer(): JSX.Element {
    const navigate = useNavigate();
    const { clubId } = useClubAccess();
    const search = useSearch({ strict: false }) as BookCourtSearch;

    const [date, setDate] = useState(search.date ?? todayIso());
    const [surface, setSurface] = useState(search.surface ?? "");
    const [fromTime, setFromTime] = useState(search.from ?? "");
    const [toTime, setToTime] = useState(search.to ?? "");
    const [selectedSlot, setSelectedSlot] = useState<ClubAvailabilitySlot | null>(null);
    const [bookingModal, setBookingModal] = useState<BookingModal>(null);
    const [joinBookingId, setJoinBookingId] = useState("");
    const [payingBooking, setPayingBooking] = useState<PlayerBookingItem | null>(null);
    const [paymentDeadlineIso, setPaymentDeadlineIso] = useState<string | undefined>(undefined);
    const [joinError, setJoinError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const startedJoinRef = useRef("");
    const joinPaymentSucceededRef = useRef(false);

    const { data: myProfile } = useMyProfile();
    const joinMutation = useJoinBooking(clubId ?? "", joinBookingId);

    useEffect(() => {
        if (!joinBookingId) return;
        if (startedJoinRef.current === joinBookingId) return;
        startedJoinRef.current = joinBookingId;
        joinMutation.mutate(undefined, {
            onSuccess: (booking: Booking) => {
                setJoinBookingId("");
                startedJoinRef.current = "";
                setJoinError("");
                const me = booking.players.find((p) => p.user_id === myProfile?.id);
                if (me && me.amount_due > 0) {
                    const item: PlayerBookingItem = {
                        booking_id: booking.id,
                        club_id: booking.club_id,
                        court_id: booking.court_id,
                        court_name: booking.court_name,
                        booking_type: booking.booking_type,
                        status: booking.status,
                        start_datetime: booking.start_datetime,
                        end_datetime: booking.end_datetime,
                        role: me.role,
                        invite_status: me.invite_status,
                        payment_status: me.payment_status,
                        amount_due: me.amount_due,
                    };
                    setPaymentDeadlineIso(new Date(Date.now() + 5 * 60 * 1000).toISOString());
                    setPayingBooking(item);
                } else {
                    setSuccessMessage("Joined game successfully.");
                }
            },
            onError: (error) => {
                setJoinError(error.message);
                setJoinBookingId("");
                startedJoinRef.current = "";
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joinBookingId]);

    const syncUrl = useCallback(
        (patch: Partial<{ date: string; surface: string; from: string; to: string }>) => {
            void navigate({
                to: "/book-court",
                search: {
                    date: patch.date ?? date,
                    surface: (patch.surface ?? surface) || undefined,
                    from: (patch.from ?? fromTime) || undefined,
                    to: (patch.to ?? toTime) || undefined,
                },
                replace: true,
            });
        },
        [navigate, date, surface, fromTime, toTime]
    );

    const handleDateChange = useCallback(
        (v: string) => {
            setDate(v);
            setSelectedSlot(null);
            syncUrl({ date: v });
        },
        [syncUrl]
    );

    const handleSurfaceChange = useCallback(
        (v: string) => {
            setSurface(v);
            syncUrl({ surface: v });
        },
        [syncUrl]
    );

    const handleFromTimeChange = useCallback(
        (v: string) => {
            setFromTime(v);
            setSelectedSlot(null);
            syncUrl({ from: v });
        },
        [syncUrl]
    );

    const handleToTimeChange = useCallback(
        (v: string) => {
            setToTime(v);
            setSelectedSlot(null);
            syncUrl({ to: v });
        },
        [syncUrl]
    );

    const params: ClubAvailabilityParams = {
        start_date: date,
        end_date: date,
        ...(surface ? { surface: surface as ClubAvailabilityParams["surface"] } : {}),
        ...(fromTime ? { from_time: fromTime } : {}),
        ...(toTime ? { to_time: toTime } : {}),
    };

    const {
        data: availability,
        isLoading,
        error,
        refetch,
    } = useGetClubAvailability(clubId ?? "", params);

    useEffect(() => {
        const availableSlots = availability?.days[0]?.slots ?? [];
        setSelectedSlot((currentSlot) => {
            const fallbackSlot = availableSlots.at(0);
            if (!fallbackSlot) return null;
            if (!currentSlot) return fallbackSlot;

            return (
                availableSlots.find(
                    (slot) =>
                        slot.start_time === currentSlot.start_time &&
                        slot.end_time === currentSlot.end_time
                ) ?? fallbackSlot
            );
        });
    }, [availability]);

    const handleRefresh = useCallback(() => void refetch(), [refetch]);

    const handleClear = useCallback(() => {
        const today = todayIso();
        setDate(today);
        setSurface("");
        setFromTime("");
        setToTime("");
        setSelectedSlot(null);
        void navigate({
            to: "/book-court",
            search: { date: today, surface: undefined, from: undefined, to: undefined },
            replace: true,
        });
    }, [navigate]);

    const handleBook = useCallback(
        (courtId: string, slot: ClubAvailabilitySlot) => {
            const court = availability?.courts.find((c) => c.id === courtId);
            setPaymentDeadlineIso(new Date(Date.now() + 5 * 60 * 1000).toISOString());
            setBookingModal({
                courtId,
                courtName: court?.name ?? courtId,
                date,
                startTime: slot.start_time,
            });
        },
        [availability?.courts, date]
    );

    const handleJoin = useCallback((bookingId: string) => {
        setJoinBookingId(bookingId);
    }, []);

    return (
        <>
            <BookCourtView
                date={date}
                surface={surface}
                fromTime={fromTime}
                toTime={toTime}
                availability={availability}
                isLoading={isLoading}
                error={error as Error | null}
                selectedSlot={selectedSlot}
                isJoining={joinMutation.isPending || Boolean(joinBookingId)}
                joiningBookingId={joinBookingId}
                joinError={joinError}
                successMessage={successMessage}
                onDateChange={handleDateChange}
                onSurfaceChange={handleSurfaceChange}
                onFromTimeChange={handleFromTimeChange}
                onToTimeChange={handleToTimeChange}
                onSelectSlot={setSelectedSlot}
                onBook={handleBook}
                onJoin={handleJoin}
                onRefresh={handleRefresh}
                onClear={handleClear}
                onDismissJoinError={() => setJoinError("")}
                onDismissSuccess={() => setSuccessMessage("")}
            />
            {bookingModal ? (
                <NewBookingModal
                    courtId={bookingModal.courtId}
                    courtName={bookingModal.courtName}
                    date={bookingModal.date}
                    startTime={bookingModal.startTime}
                    paymentDeadlineIso={paymentDeadlineIso}
                    onClose={() => {
                        setBookingModal(null);
                        setPaymentDeadlineIso(undefined);
                    }}
                    onSuccess={() => {
                        setBookingModal(null);
                        setPaymentDeadlineIso(undefined);
                        setSuccessMessage(
                            "Booking created. Go to My Bookings to complete payment — your slot will be released if payment isn't made in time."
                        );
                        void refetch();
                    }}
                    onPaymentSuccess={() => {
                        setBookingModal(null);
                        setPaymentDeadlineIso(undefined);
                        setSuccessMessage("Court booked and payment confirmed!");
                        void refetch();
                    }}
                />
            ) : null}
            {payingBooking ? (
                <PaymentModal
                    context={{ type: "booking", booking: payingBooking }}
                    paymentDeadline={paymentDeadlineIso ? new Date(paymentDeadlineIso) : undefined}
                    onClose={() => {
                        const paid = joinPaymentSucceededRef.current;
                        joinPaymentSucceededRef.current = false;
                        setPayingBooking(null);
                        setPaymentDeadlineIso(undefined);
                        setSuccessMessage(
                            paid
                                ? "Joined and paid successfully."
                                : "You've joined! Go to My Bookings to complete payment — your spot will be released if payment isn't made in time."
                        );
                        void refetch();
                    }}
                    onSuccess={() => {
                        joinPaymentSucceededRef.current = true;
                    }}
                />
            ) : null}
        </>
    );
}
