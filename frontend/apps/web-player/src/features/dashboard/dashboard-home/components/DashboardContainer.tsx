import { useAuth } from "@repo/auth";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    useGetCourtAvailability,
    useJoinBooking,
    useListCourts,
    useListOpenGames,
} from "../../hooks";
import type { BookingModalState, ClubOption, OpenGameFilters, SurfaceType } from "../../types";
import DashboardView from "./DashboardView";

type JoinFilters = {
    date: string;
    minSkill: string;
    maxSkill: string;
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

function parseOptionalNumber(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
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
        minSkill: "",
        maxSkill: "",
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

    useEffect(() => {
        if (!clubId && clubs[0]) {
            setActiveClubId(clubs[0].id, clubs[0].name, clubs[0].role);
        }
    }, [clubId, clubs, setActiveClubId]);

    const openGameFilters = useMemo<OpenGameFilters>(
        () => ({
            date: joinFilters.date || undefined,
            min_skill: parseOptionalNumber(joinFilters.minSkill),
            max_skill: parseOptionalNumber(joinFilters.maxSkill),
        }),
        [joinFilters.date, joinFilters.maxSkill, joinFilters.minSkill]
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
    } = useListOpenGames(selectedClubId, openGameFilters);

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

    return (
        <DashboardView
            clubs={clubs}
            selectedClubId={selectedClubId}
            selectedClubName={selectedClub?.name ?? ""}
            joinFilterDate={joinFilters.date}
            joinFilterMinSkill={joinFilters.minSkill}
            joinFilterMaxSkill={joinFilters.maxSkill}
            bookFilterDate={bookFilters.date}
            bookFilterSurfaceType={bookFilters.surfaceType}
            bookFilterTimeFrom={bookFilters.timeFrom}
            bookFilterTimeTo={bookFilters.timeTo}
            openGames={openGames}
            courts={courts}
            availability={availability ?? null}
            availabilityCourtId={availabilityCourtId}
            bookingModal={bookingModal}
            isOpenGamesLoading={isOpenGamesLoading}
            isCourtsLoading={isCourtsLoading}
            isAvailabilityLoading={isAvailabilityLoading}
            isJoining={joinMutation.isPending || Boolean(joinBookingId)}
            joiningBookingId={joinBookingId}
            openGamesError={openGamesError}
            courtsError={courtsError}
            availabilityError={availabilityError}
            joinError={joinError}
            successMessage={successMessage}
            onClubChange={handleClubChange}
            onJoinFilterDateChange={(date) => setJoinFilters((prev) => ({ ...prev, date }))}
            onJoinFilterMinSkillChange={(minSkill) =>
                setJoinFilters((prev) => ({ ...prev, minSkill }))
            }
            onJoinFilterMaxSkillChange={(maxSkill) =>
                setJoinFilters((prev) => ({ ...prev, maxSkill }))
            }
            onBookFilterDateChange={(date) => {
                setBookFilters((prev) => ({ ...prev, date }));
                setAvailabilityCourtId("");
            }}
            onBookFilterSurfaceTypeChange={(surfaceType) => {
                setBookFilters((prev) => ({ ...prev, surfaceType }));
                setAvailabilityCourtId("");
            }}
            onBookFilterTimeFromChange={(timeFrom) => {
                setBookFilters((prev) => ({ ...prev, timeFrom }));
                setAvailabilityCourtId("");
            }}
            onBookFilterTimeToChange={(timeTo) => {
                setBookFilters((prev) => ({ ...prev, timeTo }));
                setAvailabilityCourtId("");
            }}
            onCheckAvailability={handleCheckAvailability}
            onRefreshOpenGames={() => void refetchOpenGames()}
            onRefreshCourts={() => void refetchCourts()}
            onJoinGame={(bookingId) => {
                setJoinError("");
                setJoinBookingId(bookingId);
            }}
            onOpenBooking={handleOpenBooking}
            onCloseBooking={() => setBookingModal(null)}
            onBookingSuccess={() => {
                setBookingModal(null);
                setSuccessMessage("Booking created successfully.");
                void refetchCourts();
                if (availabilityCourtId) void refetchAvailability();
                void refetchOpenGames();
            }}
            onDismissJoinError={() => setJoinError("")}
            onDismissSuccess={() => setSuccessMessage("")}
        />
    );
}
