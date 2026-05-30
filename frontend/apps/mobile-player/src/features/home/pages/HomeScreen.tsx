import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useGetClubAvailability, useJoinBooking, useMyProfile } from "@repo/player-domain";
import type { ClubAvailabilityParams } from "@repo/player-domain";
import { useAuth } from "@repo/auth";
import type { ClubAvailabilitySlot } from "../types";
import { HomeView } from "./HomeView";
import { NewBookingSheet } from "../../booking/new-booking/components/NewBookingSheet";
import type { PlayerBookingItem, Booking } from "../../booking/types";
import { useThemeColors } from "../../../theme";

type BookingModal = { courtId: string; date: string; startTime: string } | null;

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export function HomeScreen(): JSX.Element {
    const { clubId } = useAuth();
    const { data: profile } = useMyProfile();

    const [date, setDate] = useState(todayIso);
    const [surface, setSurface] = useState("");
    const [fromTime, setFromTime] = useState("");
    const [toTime, setToTime] = useState("");
    const [selectedSlot, setSelectedSlot] = useState<ClubAvailabilitySlot | null>(null);
    const [showAvailableSlot, setShowAvailableSlot] = useState(true);
    const [showOpenGame, setShowOpenGame] = useState(true);
    const [joinBookingId, setJoinBookingId] = useState("");
    const [bookingModal, setBookingModal] = useState<BookingModal>(null);
    const [, setPendingPayment] = useState<PlayerBookingItem | null>(null);
    const startedJoinRef = useRef("");

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

    const joinMutation = useJoinBooking(clubId ?? "", joinBookingId);

    // Auto-select first slot when availability changes
    useEffect(() => {
        const availableSlots = availability?.days[0]?.slots ?? [];
        setSelectedSlot((current) => {
            const fallback = availableSlots[0] ?? null;
            if (!fallback) return null;
            if (!current) return fallback;
            return (
                availableSlots.find(
                    (s) => s.start_time === current.start_time && s.end_time === current.end_time
                ) ?? fallback
            );
        });
    }, [availability]);

    // Trigger join mutation once per joinBookingId
    useEffect(() => {
        if (!joinBookingId) return;
        if (startedJoinRef.current === joinBookingId) return;
        startedJoinRef.current = joinBookingId;
        joinMutation.mutate(undefined, {
            onSuccess: (booking: Booking) => {
                setJoinBookingId("");
                startedJoinRef.current = "";
                const me = booking.players.find((p) => p.user_id === profile?.id);
                if (me && me.amount_due > 0) {
                    setPendingPayment({
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
                    });
                }
            },
            onError: () => {
                setJoinBookingId("");
                startedJoinRef.current = "";
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joinBookingId]);

    const handleDateChange = useCallback((v: string) => {
        setDate(v);
        setSelectedSlot(null);
    }, []);

    const handleSurfaceChange = useCallback((v: string) => setSurface(v), []);
    const handleFromTimeChange = useCallback((v: string) => {
        setFromTime(v);
        setSelectedSlot(null);
    }, []);
    const handleToTimeChange = useCallback((v: string) => {
        setToTime(v);
        setSelectedSlot(null);
    }, []);

    const handleClear = useCallback(() => {
        setDate(todayIso());
        setSurface("");
        setFromTime("");
        setToTime("");
        setSelectedSlot(null);
    }, []);

    const handleBook = useCallback(
        (courtId: string) => {
            if (!selectedSlot) return;
            setBookingModal({ courtId, date, startTime: selectedSlot.start_time });
        },
        [selectedSlot, date]
    );

    const handleJoin = useCallback((bookingId: string) => {
        setJoinBookingId(bookingId);
    }, []);

    const handleToggleAvailable = useCallback(
        (v: boolean) => {
            if (!v && !showOpenGame) return;
            setShowAvailableSlot(v);
        },
        [showOpenGame]
    );

    const handleToggleOpenGame = useCallback(
        (v: boolean) => {
            if (!v && !showAvailableSlot) return;
            setShowOpenGame(v);
        },
        [showAvailableSlot]
    );

    const handleRefresh = useCallback(() => void refetch(), [refetch]);
    const colors = useThemeColors();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.hero }} edges={["top"]}>
            <StatusBar style="light" />
            <HomeView
                userName={profile?.full_name}
                date={date}
                surface={surface}
                fromTime={fromTime}
                toTime={toTime}
                availability={availability}
                isLoading={isLoading}
                error={error as Error | null}
                selectedSlot={selectedSlot}
                showAvailableSlot={showAvailableSlot}
                showOpenGame={showOpenGame}
                isJoining={joinMutation.isPending || Boolean(joinBookingId)}
                joiningBookingId={joinBookingId}
                onDateChange={handleDateChange}
                onSurfaceChange={handleSurfaceChange}
                onFromTimeChange={handleFromTimeChange}
                onToTimeChange={handleToTimeChange}
                onSelectSlot={setSelectedSlot}
                onToggleAvailable={handleToggleAvailable}
                onToggleOpenGame={handleToggleOpenGame}
                onBook={handleBook}
                onJoin={handleJoin}
                onRefresh={handleRefresh}
                onClear={handleClear}
            />

            {bookingModal ? (
                <NewBookingSheet
                    visible={Boolean(bookingModal)}
                    clubId={clubId ?? null}
                    onClose={() => setBookingModal(null)}
                    onBookingCreated={(payable) => {
                        setBookingModal(null);
                        setPendingPayment(payable);
                        void refetch();
                    }}
                    onSuccess={() => {
                        setBookingModal(null);
                        void refetch();
                    }}
                />
            ) : null}
        </SafeAreaView>
    );
}
