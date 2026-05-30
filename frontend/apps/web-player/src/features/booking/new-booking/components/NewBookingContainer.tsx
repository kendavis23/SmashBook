import { useState, useCallback, useEffect, useRef } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import { useMyProfile } from "@repo/player-domain/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
    useCreateBooking,
    useListCourts,
    useGetCourtAvailability,
    useListAvailableTrainers,
} from "../../hooks";
import { useClubAccess } from "../../store";
import type { Booking, BookingInput, BookingType, PlayerBookingItem } from "../../types";
import { PaymentModal } from "../../../payment";
import NewBookingView from "./NewBookingView";
import type { NewBookingFormState } from "./NewBookingView";
import { getTrainerStaffProfileId } from "./trainerSelect";

function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function createDefaultForm(): NewBookingFormState {
    return {
        courtId: "",
        bookingType: "regular",
        bookingDate: "",
        startTime: "",
        isOpenGame: true,
        maxPlayers: "4",
        anchorSkill: "",
        skillMin: "",
        skillMax: "",
        eventName: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        playerUserIds: [],
        staffProfileId: "",
    };
}

const bookingsCreatedSearch = {
    created: true,
    cancelled: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    bookingType: undefined,
    bookingStatus: undefined,
    courtId: undefined,
    playerSearch: undefined,
};

function getPayableBookingForUser(
    booking: Booking,
    myUserId: string | undefined
): PlayerBookingItem | null {
    if (!myUserId) return null;
    const me = booking.players.find((player) => player.user_id === myUserId);
    if (!me || me.invite_status !== "accepted" || me.payment_status !== "pending") return null;

    return {
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
}

export default function NewBookingContainer(): JSX.Element {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { clubId } = useClubAccess();
    const { data: profile, isError: profileError } = useMyProfile();
    const search = useSearch({ strict: false }) as {
        courtId?: string;
        date?: string;
        startTime?: string;
    };

    const { data: courts = [] } = useListCourts(clubId ?? "");
    const courtList = courts as { id: string; name: string }[];

    const [form, setForm] = useState<NewBookingFormState>(() => ({
        ...createDefaultForm(),
        courtId: search.courtId ?? "",
        bookingDate: search.date ?? "",
        startTime: search.startTime ?? "",
    }));

    // Auto-select the first court once the list loads (only if not pre-filled)
    useEffect(() => {
        if (courtList.length > 0 && !form.courtId) {
            setForm((prev) => ({ ...prev, courtId: courtList[0]?.id ?? "" }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courtList]);
    const [courtError, setCourtError] = useState("");
    const [startError, setStartError] = useState("");
    const [staffError, setStaffError] = useState("");
    const [payingBooking, setPayingBooking] = useState<PlayerBookingItem | null>(null);
    const [createdBookingAwaitingProfile, setCreatedBookingAwaitingProfile] =
        useState<Booking | null>(null);

    const {
        data: availabilityData,
        isLoading: slotsLoading,
        refetch: refetchSlots,
    } = useGetCourtAvailability(form.courtId, form.bookingDate);
    const slots = availabilityData?.slots ?? [];
    const selectedSlot = slots.find((s) => s.start_time === form.startTime);
    const selectedPrice = selectedSlot?.price ?? null;

    // Auto-select the first available slot whenever availability data arrives (fresh)
    useEffect(() => {
        if (slotsLoading || slots.length === 0) return;
        const first = slots.find((s) => s.is_available);
        setForm((prev) => ({ ...prev, startTime: first?.start_time ?? "" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availabilityData]);

    const isLessonType =
        form.bookingType === "lesson_individual" || form.bookingType === "lesson_group";
    const {
        data: trainerData = [],
        isLoading: trainersLoading,
        isError: trainersError,
    } = useListAvailableTrainers({
        clubId: isLessonType ? (clubId ?? "") : "",
        date: form.bookingDate,
        startTime: form.startTime,
        endTime: selectedSlot?.end_time ?? "",
    });

    const prevTrainerDataRef = useRef(trainerData);
    useEffect(() => {
        if (trainerData === prevTrainerDataRef.current) return;
        prevTrainerDataRef.current = trainerData;
        if (
            form.staffProfileId &&
            !trainerData.some((t) => getTrainerStaffProfileId(t) === form.staffProfileId)
        ) {
            setForm((prev) => ({ ...prev, staffProfileId: "" }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trainerData]);

    const createMutation = useCreateBooking(clubId ?? "");
    const activeMutation = createMutation;
    const apiError = (activeMutation.error as Error | null)?.message ?? "";

    useEffect(() => {
        if (!createdBookingAwaitingProfile) return;
        if (profileError) {
            setCreatedBookingAwaitingProfile(null);
            void navigate({ to: "/bookings", search: bookingsCreatedSearch });
            return;
        }
        if (!profile?.id) return;

        const payableBooking = getPayableBookingForUser(createdBookingAwaitingProfile, profile.id);
        setCreatedBookingAwaitingProfile(null);
        if (payableBooking) {
            setPayingBooking(payableBooking);
            return;
        }
        void navigate({ to: "/bookings", search: bookingsCreatedSearch });
    }, [createdBookingAwaitingProfile, navigate, profile?.id, profileError]);

    const handleFormChange = useCallback(
        (patch: Partial<NewBookingFormState>): void => {
            setForm((prev) => {
                const next = { ...prev, ...patch };
                if (patch.bookingType !== undefined) {
                    next.isOpenGame = false;
                    if (staffError) setStaffError("");
                    if (patch.bookingType === "lesson_individual") {
                        next.maxPlayers = "1";
                        next.playerUserIds = [];
                    }
                }
                if (patch.courtId !== undefined && courtError) setCourtError("");
                if (
                    (patch.bookingDate !== undefined || patch.startTime !== undefined) &&
                    startError
                )
                    setStartError("");
                if (patch.staffProfileId !== undefined && staffError) setStaffError("");
                return next;
            });
        },
        [courtError, staffError, startError]
    );

    const validate = (): boolean => {
        let valid = true;
        if (!form.courtId) {
            setCourtError("Court is required.");
            valid = false;
        }
        if (!form.bookingDate || !form.startTime) {
            setStartError("Date and start time are required.");
            valid = false;
        }
        if (form.bookingType === "lesson_individual" && !form.staffProfileId.trim()) {
            setStaffError("Staff trainer is required for individual lessons.");
            valid = false;
        }
        return valid;
    };

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            const startDatetime = datetimeLocalToUTC(`${form.bookingDate}T${form.startTime}`);

            const invitedPlayerIds =
                form.bookingType === "lesson_individual"
                    ? []
                    : form.playerUserIds.map((id) => id.trim()).filter(Boolean);
            const payload: BookingInput = {
                club_id: clubId ?? "",
                court_id: form.courtId,
                booking_type: form.bookingType as BookingType,
                start_datetime: startDatetime,
                is_open_game: form.isOpenGame,
                max_players: parseOptionalNumber(form.maxPlayers) ?? undefined,
                anchor_skill_level: parseOptionalNumber(form.anchorSkill),
                skill_level_override_min: parseOptionalNumber(form.skillMin),
                skill_level_override_max: parseOptionalNumber(form.skillMax),
                event_name: form.eventName.trim() || null,
                contact_name: form.contactName.trim() || null,
                contact_email: form.contactEmail.trim() || null,
                contact_phone: form.contactPhone.trim() || null,
                player_user_ids: invitedPlayerIds.length > 0 ? invitedPlayerIds : undefined,
                staff_profile_id: form.staffProfileId.trim() || null,
            };

            createMutation.mutate(payload, {
                onSuccess: (booking) => {
                    const createdBooking = booking as Booking;
                    const payableBooking = getPayableBookingForUser(createdBooking, profile?.id);
                    if (payableBooking) {
                        setPayingBooking(payableBooking);
                        return;
                    }
                    if (!profile?.id && !profileError) {
                        setCreatedBookingAwaitingProfile(createdBooking);
                        return;
                    }
                    void navigate({ to: "/bookings", search: bookingsCreatedSearch });
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createMutation, navigate, profile?.id, profileError]
    );

    const goToBookingsAfterPayment = useCallback((): void => {
        setPayingBooking(null);
        void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
        void navigate({ to: "/bookings", search: bookingsCreatedSearch });
    }, [navigate, queryClient]);

    const handleCancel = useCallback((): void => {
        void navigate({
            to: "/bookings",
            search: { ...bookingsCreatedSearch, created: undefined },
        });
    }, [navigate]);

    const handleDismissError = useCallback((): void => {
        activeMutation.reset();
    }, [activeMutation]);

    return (
        <>
            <NewBookingView
                courts={courtList}
                trainers={trainerData}
                trainersLoading={trainersLoading}
                trainersError={trainersError}
                slots={slots}
                slotsLoading={slotsLoading}
                form={form}
                courtError={courtError}
                startError={startError}
                staffError={staffError}
                apiError={apiError}
                isPending={activeMutation.isPending || createdBookingAwaitingProfile != null}
                onFormChange={handleFormChange}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                onDismissError={handleDismissError}
                onRefreshSlots={() => void refetchSlots()}
                selectedPrice={selectedPrice}
                clubId={clubId}
            />
            {payingBooking ? (
                <PaymentModal
                    context={{ type: "booking", booking: payingBooking }}
                    onClose={goToBookingsAfterPayment}
                    onSuccess={() => {
                        void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
                        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
                    }}
                />
            ) : null}
        </>
    );
}
