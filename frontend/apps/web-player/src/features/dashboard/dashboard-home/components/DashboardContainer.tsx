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
import type { BookingModalState, ClubOption, OpenGameFilters, SurfaceType } from "../../types";
import DashboardView from "./DashboardView";
import DashboardViewMobile from "./DashboardViewMobile";

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

export default function DashboardContainer(): JSX.Element {
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
    });
    const [bookFilters, setBookFilters] = useState<BookFilters>({
        date: today,
        surfaceType: "",
        timeFrom: "",
        timeTo: "",
    });
    const [availabilityCourtId, setAvailabilityCourtId] = useState("");
    const [bookingModal, setBookingModal] = useState<BookingModalState>(null);
    const [joinBookingId, setJoinBookingId] = useState("");
    const [joinError, setJoinError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
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
            timeFrom: bookFilters.timeFrom || undefined,
            timeTo: bookFilters.timeTo || undefined,
        }),
        [bookFilters.date, bookFilters.surfaceType, bookFilters.timeFrom, bookFilters.timeTo]
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

    const isMobile = useIsMobile();
    const joinMutation = useJoinBooking(selectedClubId, joinBookingId);

    useEffect(() => {
        if (!joinBookingId) return;
        if (startedJoinRef.current === joinBookingId) return;
        startedJoinRef.current = joinBookingId;
        joinMutation.mutate(undefined, {
            onSuccess: () => {
                setJoinBookingId("");
                startedJoinRef.current = "";
                setJoinError("");
                setSuccessMessage("Joined game successfully.");
                void refetchOpenGames();
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
            setBookingModal({ courtId, courtName, date: bookFilters.date, startTime });
        },
        [bookFilters.date]
    );

    const sharedProps = {
        clubs,
        selectedClubId,
        selectedClubName: selectedClub?.name ?? "",
        joinFilterDate: joinFilters.date,
        bookFilterDate: bookFilters.date,
        bookFilterSurfaceType: bookFilters.surfaceType,
        bookFilterTimeFrom: bookFilters.timeFrom,
        bookFilterTimeTo: bookFilters.timeTo,
        openGames,
        courts,
        availability: availability ?? null,
        availabilityCourtId,
        bookingModal,
        isOpenGamesLoading: isMyProfileLoading || isOpenGamesLoading,
        isCourtsLoading,
        isAvailabilityLoading,
        isJoining: joinMutation.isPending || Boolean(joinBookingId),
        joiningBookingId: joinBookingId,
        openGamesError: myProfileError ?? openGamesError,
        courtsError,
        availabilityError,
        joinError,
        successMessage,
        onClubChange: handleClubChange,
        onJoinFilterDateChange: (date: string) =>
            setJoinFilters((prev) => ({ ...prev, date })),
        onBookFilterDateChange: (date: string) => {
            setBookFilters((prev) => ({ ...prev, date }));
            setAvailabilityCourtId("");
        },
        onBookFilterSurfaceTypeChange: (surfaceType: "" | SurfaceType) => {
            setBookFilters((prev) => ({ ...prev, surfaceType }));
            setAvailabilityCourtId("");
        },
        onBookFilterTimeFromChange: (timeFrom: string) => {
            setBookFilters((prev) => ({ ...prev, timeFrom }));
            setAvailabilityCourtId("");
        },
        onBookFilterTimeToChange: (timeTo: string) => {
            setBookFilters((prev) => ({ ...prev, timeTo }));
            setAvailabilityCourtId("");
        },
        onCheckAvailability: handleCheckAvailability,
        onRefreshOpenGames: () => {
            if (playerSkillLevel != null) void refetchOpenGames();
        },
        onRefreshCourts: () => void refetchCourts(),
        onJoinGame: (bookingId: string) => {
            setJoinError("");
            setJoinBookingId(bookingId);
        },
        onOpenBooking: handleOpenBooking,
        onCloseBooking: () => setBookingModal(null),
        onBookingSuccess: () => {
            setBookingModal(null);
            setSuccessMessage("Booking created successfully.");
            void refetchCourts();
            if (availabilityCourtId) void refetchAvailability();
            void refetchOpenGames();
        },
        onDismissJoinError: () => setJoinError(""),
        onDismissSuccess: () => setSuccessMessage(""),
    };

    if (isMobile) {
        return <DashboardViewMobile {...sharedProps} />;
    }

    return <DashboardView {...sharedProps} />;
}
