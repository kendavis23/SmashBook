import { useState, useCallback, useEffect, useRef } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToApi } from "@repo/ui";
import { useMyProfile } from "@repo/player-domain/hooks";
import { useQueryClient } from "@tanstack/react-query";
import {
    useCreateBooking,
    useGetCourtAvailability,
    useListCourts,
    useListAvailableTrainers,
    useGetPriceQuote,
} from "../../hooks";
import { useClubAccess } from "../../store";
import type { Booking, BookingInput, BookingType, PlayerBookingItem } from "../../types";
import { PaymentModal } from "../../../payment";
import NewBookingView from "./NewBookingView";
import type { NewBookingFormState } from "./NewBookingView";
import { getTrainerStaffProfileId } from "./trainerSelect";

type Props = {
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
    onClose: () => void;
    onSuccess?: () => void;
    onPaymentSuccess?: () => void;
    /** ISO datetime string — when set, PaymentModal shows a countdown and auto-closes on expiry */
    paymentDeadlineIso?: string;
};

function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

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
}

export default function NewBookingModalContainer({
    courtId,
    courtName,
    date,
    startTime,
    onClose,
    onSuccess,
    onPaymentSuccess,
    paymentDeadlineIso,
}: Props): JSX.Element {
    const paymentDeadline = paymentDeadlineIso ? new Date(paymentDeadlineIso) : undefined;
    const queryClient = useQueryClient();
    const { clubId } = useClubAccess();
    const { data: profile, isError: profileError } = useMyProfile();
    const { data: courts = [] } = useListCourts(clubId ?? "");
    const courtList = courts as { id: string; name: string }[];

    const [form, setForm] = useState<NewBookingFormState>({
        courtId,
        bookingType: "regular",
        bookingDate: date,
        startTime,
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
    });

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

    const startDatetimeForQuote =
        form.bookingDate && form.startTime ? `${form.bookingDate}T${form.startTime}:00` : "";
    const { data: priceQuote } = useGetPriceQuote({
        club_id: clubId ?? "",
        start_datetime: startDatetimeForQuote,
        booking_type: form.bookingType as BookingType,
        max_players: parseInt(form.maxPlayers, 10) || 4,
    });

    // Auto-select first available slot when availability data arrives and no slot is pre-selected
    useEffect(() => {
        if (slotsLoading || slots.length === 0 || form.startTime) return;
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
    const apiError = (createMutation.error as Error | null)?.message ?? "";

    useEffect(() => {
        if (!createdBookingAwaitingProfile) return;
        if (profileError) {
            setCreatedBookingAwaitingProfile(null);
            onClose();
            onSuccess?.();
            return;
        }
        if (!profile?.id) return;

        const payableBooking = getPayableBookingForUser(createdBookingAwaitingProfile, profile.id);
        setCreatedBookingAwaitingProfile(null);
        if (payableBooking) {
            setPayingBooking(payableBooking);
            return;
        }
        onClose();
        onSuccess?.();
    }, [createdBookingAwaitingProfile, onClose, onSuccess, profile?.id, profileError]);

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

            const startDatetime = datetimeLocalToApi(`${form.bookingDate}T${form.startTime}`);

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
                    onClose();
                    onSuccess?.();
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createMutation, onClose, onSuccess, profile?.id, profileError]
    );

    const paymentSucceededRef = useRef(false);

    const finishPaymentFlow = useCallback((): void => {
        setPayingBooking(null);
        void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
        if (paymentSucceededRef.current) {
            paymentSucceededRef.current = false;
            if (onPaymentSuccess) {
                onPaymentSuccess();
            } else {
                onClose();
            }
        } else if (onSuccess) {
            onSuccess();
        } else {
            onClose();
        }
    }, [onClose, onSuccess, onPaymentSuccess, queryClient]);

    return (
        <>
            <NewBookingView
                mode="modal"
                courtName={courtName}
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
                isPending={createMutation.isPending || createdBookingAwaitingProfile != null}
                onFormChange={handleFormChange}
                onSubmit={handleSubmit}
                onCancel={onClose}
                onClose={onClose}
                onDismissError={() => createMutation.reset()}
                onRefreshSlots={() => void refetchSlots()}
                priceQuote={priceQuote}
                clubId={clubId}
            />
            {payingBooking ? (
                <PaymentModal
                    context={{ type: "booking", booking: payingBooking }}
                    paymentDeadline={paymentDeadline}
                    onClose={finishPaymentFlow}
                    onSuccess={() => {
                        paymentSucceededRef.current = true;
                        void queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });
                        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
                    }}
                />
            ) : null}
        </>
    );
}
