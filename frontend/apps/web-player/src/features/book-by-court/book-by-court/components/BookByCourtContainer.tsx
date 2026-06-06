import { useAuth } from "@repo/auth";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    useGetCourtAvailability,
    useJoinBooking,
    useListCourts,
    useListOpenGames,
    useMyProfile,
} from "../../hooks";
import type {
    BookingModalState,
    ClubOption,
    JoinStatusFilter,
    OpenGameFilters,
    SurfaceType,
} from "../../types";
import type { Booking } from "@repo/player-domain/models";
import type { PlayerBookingItem } from "@repo/player-domain/models";
import { PaymentModal } from "../../../payment";
import BookByCourtView from "./BookByCourtView";
import BookByCourtViewMobile from "./BookByCourtViewMobile";

function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return isMobile;
}

type JoinFilters = {
    date: string;
    status: JoinStatusFilter;
};

type BookFilters = {
    date: string;
    surfaceType: "" | SurfaceType;
    timeFrom: string;
    timeTo: string;
};

function todayInputValue(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function BookByCourtContainer(): JSX.Element {
    const { clubs: authClubs, clubId, setActiveClubId } = useAuth();
    const clubs = useMemo<ClubOption[]>(
        () =>
            authClubs.map((club) => ({ id: club.club_id, name: club.club_name, role: club.role })),
        [authClubs]
    );
    const selectedClubId = clubId ?? clubs[0]?.id ?? "";
    const selectedClub = clubs.find((club) => club.id === selectedClubId) ?? clubs[0] ?? null;

    const today = useMemo(() => todayInputValue(), []);
    const [joinFilters, setJoinFilters] = useState<JoinFilters>({
        date: "",
        status: "all",
    });
    const [bookFilters, setBookFilters] = useState<BookFilters>({
        date: today,
        surfaceType: "",
        timeFrom: "",
        timeTo: "",
    });
    // Committed time values — only update the API query on popover close, not on each selection
    const [committedTimeFrom, setCommittedTimeFrom] = useState("");
    const [committedTimeTo, setCommittedTimeTo] = useState("");
    const [availabilityCourtId, setAvailabilityCourtId] = useState("");
    const [bookingModal, setBookingModal] = useState<BookingModalState>(null);
    const [joinBookingId, setJoinBookingId] = useState("");
    const [joinError, setJoinError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [warningMessage, setWarningMessage] = useState("");
    const [payingBooking, setPayingBooking] = useState<PlayerBookingItem | null>(null);
    const [paymentDeadlineIso, setPaymentDeadlineIso] = useState<string | undefined>(undefined);
    const startedJoinRef = useRef("");
    const {
        data: myProfile,
        isLoading: isMyProfileLoading,
        error: myProfileError,
    } = useMyProfile();
    const playerSkillLevel = myProfile?.skill_level ?? undefined;

    useEffect(() => {
        if (!clubId && clubs[0]) {
            setActiveClubId(clubs[0].id, clubs[0].name, clubs[0].role);
        }
    }, [clubId, clubs, setActiveClubId]);

    const openGameFilters = useMemo<OpenGameFilters>(
        () => ({
            date: joinFilters.date || undefined,
            player_skill_level: playerSkillLevel,
        }),
        [joinFilters.date, playerSkillLevel]
    );

    const courtFilters = useMemo(
        () => ({
            date: bookFilters.date || undefined,
            surfaceType: bookFilters.surfaceType || undefined,
            timeFrom: committedTimeFrom || undefined,
            timeTo: committedTimeTo || undefined,
        }),
        [bookFilters.date, bookFilters.surfaceType, committedTimeFrom, committedTimeTo]
    );

    const {
        data: openGames = [],
        isLoading: isOpenGamesLoading,
        error: openGamesError,
        refetch: refetchOpenGames,
    } = useListOpenGames(playerSkillLevel == null ? "" : selectedClubId, openGameFilters);

    const {
        data: courts = [],
        isLoading: isCourtsLoading,
        error: courtsError,
        refetch: refetchCourts,
    } = useListCourts(selectedClubId, courtFilters);

    const {
        data: availability,
        isLoading: isAvailabilityLoading,
        error: availabilityError,
        refetch: refetchAvailability,
    } = useGetCourtAvailability(availabilityCourtId, bookFilters.date);

    const currentUserId = myProfile?.id ?? "";
    const filteredOpenGames = useMemo(() => {
        if (joinFilters.status === "joined") {
            return openGames.filter((g) =>
                g.players.some((p) => p.user_id === currentUserId && p.invite_status === "accepted")
            );
        }
        if (joinFilters.status === "open") {
            return openGames.filter(
                (g) =>
                    !g.players.some(
                        (p) => p.user_id === currentUserId && p.invite_status === "accepted"
                    )
            );
        }
        return openGames;
    }, [openGames, joinFilters.status, currentUserId]);

    const isMobile = useIsMobile();
    const joinMutation = useJoinBooking(selectedClubId, joinBookingId);

    useEffect(() => {
        if (!joinBookingId) return;
        if (startedJoinRef.current === joinBookingId) return;
        startedJoinRef.current = joinBookingId;
        joinMutation.mutate(undefined, {
            onSuccess: (booking: Booking) => {
                setJoinBookingId("");
                startedJoinRef.current = "";
                setJoinError("");
                void refetchOpenGames();

                const me = booking.players.find((p) => p.user_id === myProfile?.id);
                if (me && me.amount_due > 0) {
                    const item: PlayerBookingItem = {
                        booking_id: booking.id,
                        club_id: booking.club_id,
                        club_name: booking.club_name ?? "",
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
        // joinMutation changes identity after the selected booking id is committed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [joinBookingId]);

    const handleClubChange = useCallback(
        (nextClubId: string): void => {
            const nextClub = clubs.find((club) => club.id === nextClubId);
            if (!nextClub) return;
            setActiveClubId(nextClub.id, nextClub.name, nextClub.role);
            setAvailabilityCourtId("");
            setJoinError("");
            setSuccessMessage("");
        },
        [clubs, setActiveClubId]
    );

    const handleCheckAvailability = useCallback((courtId: string): void => {
        setAvailabilityCourtId(courtId);
    }, []);

    const handleOpenBooking = useCallback(
        (courtId: string, courtName: string, startTime: string): void => {
            const deadlineIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            setPaymentDeadlineIso(deadlineIso);
            setBookingModal({
                courtId,
                courtName,
                date: bookFilters.date,
                startTime,
                paymentDeadlineIso: deadlineIso,
            });
        },
        [bookFilters.date]
    );

    const sharedProps = {
        currentUserId,
        club: {
            clubs,
            selectedId: selectedClubId,
            selectedName: selectedClub?.name ?? "",
            onChange: handleClubChange,
        },
        joinSection: {
            filterDate: joinFilters.date,
            filterStatus: joinFilters.status,
            games: filteredOpenGames,
            isLoading: isMyProfileLoading || isOpenGamesLoading,
            error: myProfileError ?? openGamesError,
            isJoining: joinMutation.isPending || Boolean(joinBookingId),
            joiningBookingId: joinBookingId,
            onFilterDateChange: (date: string) => setJoinFilters((prev) => ({ ...prev, date })),
            onFilterStatusChange: (status: JoinStatusFilter) =>
                setJoinFilters((prev) => ({ ...prev, status })),
            onRefresh: () => {
                if (playerSkillLevel != null) void refetchOpenGames();
            },
            onJoinGame: (bookingId: string) => {
                setJoinError("");
                setJoinBookingId(bookingId);
            },
        },
        bookSection: {
            filterDate: bookFilters.date,
            filterSurface: bookFilters.surfaceType,
            filterTimeFrom: bookFilters.timeFrom,
            filterTimeTo: bookFilters.timeTo,
            courts,
            isLoading: isCourtsLoading,
            error: courtsError,
            onFilterDateChange: (date: string) => {
                setBookFilters((prev) => ({ ...prev, date }));
                setAvailabilityCourtId("");
            },
            onFilterSurfaceChange: (surfaceType: "" | SurfaceType) => {
                setBookFilters((prev) => ({ ...prev, surfaceType }));
                setAvailabilityCourtId("");
            },
            onFilterTimeFromChange: (timeFrom: string) => {
                setBookFilters((prev) => ({ ...prev, timeFrom }));
            },
            onFilterTimeFromCommit: (timeFrom: string) => {
                setCommittedTimeFrom(timeFrom);
                setAvailabilityCourtId("");
            },
            onFilterTimeToChange: (timeTo: string) => {
                setBookFilters((prev) => ({ ...prev, timeTo }));
            },
            onFilterTimeToCommit: (timeTo: string) => {
                setCommittedTimeTo(timeTo);
                setAvailabilityCourtId("");
            },
            onRefresh: () => void refetchCourts(),
            onCheckAvailability: handleCheckAvailability,
        },
        availability: {
            courtId: availabilityCourtId,
            data: availability ?? null,
            isLoading: isAvailabilityLoading,
            error: availabilityError,
            onOpenBooking: handleOpenBooking,
        },
        bookingModal,
        onCloseBooking: () => {
            setBookingModal(null);
            setPaymentDeadlineIso(undefined);
        },
        onBookingSuccess: () => {
            setBookingModal(null);
            setPaymentDeadlineIso(undefined);
            setWarningMessage(
                "Go to Bookings and complete payment before the hold expires to secure your slot."
            );
            void refetchCourts();
            if (availabilityCourtId) void refetchAvailability();
            void refetchOpenGames();
        },
        onBookingPaid: () => {
            setBookingModal(null);
            setPaymentDeadlineIso(undefined);
            setSuccessMessage("Court booked and payment confirmed!");
            void refetchCourts();
            if (availabilityCourtId) void refetchAvailability();
            void refetchOpenGames();
        },
        feedback: {
            joinError,
            successMessage,
            warningMessage,
            onDismissJoinError: () => setJoinError(""),
            onDismissSuccess: () => setSuccessMessage(""),
            onDismissWarning: () => setWarningMessage(""),
        },
    };

    const joinPaymentSucceededRef = useRef(false);
    const paymentModal = payingBooking ? (
        <PaymentModal
            context={{ type: "booking", booking: payingBooking }}
            paymentDeadline={paymentDeadlineIso ? new Date(paymentDeadlineIso) : undefined}
            onClose={() => {
                const paid = joinPaymentSucceededRef.current;
                joinPaymentSucceededRef.current = false;
                setPayingBooking(null);
                setPaymentDeadlineIso(undefined);
                if (paid) {
                    setSuccessMessage("Joined and paid successfully.");
                } else {
                    setWarningMessage(
                        "Go to Bookings and complete payment before the hold expires to secure your place in the game."
                    );
                }
                void refetchOpenGames();
            }}
            onSuccess={() => {
                joinPaymentSucceededRef.current = true;
            }}
        />
    ) : null;

    if (isMobile) {
        return (
            <>
                <BookByCourtViewMobile {...sharedProps} />
                {paymentModal}
            </>
        );
    }

    return (
        <>
            <BookByCourtView {...sharedProps} />
            {paymentModal}
        </>
    );
}
