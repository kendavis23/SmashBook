import { useState, useCallback, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import {
    useCreateBooking,
    useCreateRecurringBooking,
    useGetCourtAvailability,
    useListCourts,
    useListTrainers,
} from "../../hooks";
import { useClubAccess } from "../../store";
import type { BookingInput, BookingType, RecurringBookingInput } from "../../types";
import NewBookingView from "./NewBookingView";
import type { NewBookingFormState } from "./NewBookingView";

type Props = {
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
    onClose: () => void;
    onSuccess?: () => void;
};

function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

export default function NewBookingModalContainer({
    courtId,
    courtName,
    date,
    startTime,
    onClose,
    onSuccess,
}: Props): JSX.Element {
    const { clubId } = useClubAccess();
    const { data: courts = [] } = useListCourts(clubId ?? "");
    const courtList = courts as { id: string; name: string }[];

    const [form, setForm] = useState<NewBookingFormState>({
        courtId,
        bookingType: "regular",
        bookingDate: date,
        startTime,
        isOpenGame: false,
        maxPlayers: "4",
        notes: "",
        anchorSkill: "",
        skillMin: "",
        skillMax: "",
        eventName: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        onBehalfOf: "",
        playerUserIds: [],
        staffProfileId: "",
        isRecurring: false,
        recurrenceRule: "",
        skipConflicts: false,
    });

    const isLessonType =
        form.bookingType === "lesson_individual" || form.bookingType === "lesson_group";
    const { data: trainers = [] } = useListTrainers(isLessonType ? (clubId ?? "") : "");
    const trainerList = trainers.filter((t) => t.is_active !== false);

    const [courtError, setCourtError] = useState("");
    const [startError, setStartError] = useState("");

    const {
        data: availabilityData,
        isLoading: slotsLoading,
        refetch: refetchSlots,
    } = useGetCourtAvailability(form.courtId, form.bookingDate);
    const slots = availabilityData?.slots ?? [];
    const selectedPrice = slots.find((s) => s.start_time === form.startTime)?.price ?? null;

    // Auto-select first available slot when availability data arrives and no slot is pre-selected
    useEffect(() => {
        if (slotsLoading || slots.length === 0 || form.startTime) return;
        const first = slots.find((s) => s.is_available);
        setForm((prev) => ({ ...prev, startTime: first?.start_time ?? "" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availabilityData]);

    const createMutation = useCreateBooking(clubId ?? "");
    const createRecurringMutation = useCreateRecurringBooking(clubId ?? "");
    const activeMutation = form.isRecurring ? createRecurringMutation : createMutation;
    const apiError = (activeMutation.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback(
        (patch: Partial<NewBookingFormState>): void => {
            setForm((prev) => {
                const next = { ...prev, ...patch };
                if (patch.bookingType !== undefined) {
                    next.isOpenGame = false;
                }
                if (patch.courtId !== undefined && courtError) setCourtError("");
                if (
                    (patch.bookingDate !== undefined || patch.startTime !== undefined) &&
                    startError
                )
                    setStartError("");
                if (
                    (patch.onBehalfOf !== undefined || patch.isOpenGame !== undefined) &&
                    onBehalfOfError
                )
                    setOnBehalfOfError("");
                return next;
            });
        },
        [courtError, startError]
    );

    const [onBehalfOfError, setOnBehalfOfError] = useState("");

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
        if (!form.isOpenGame && !form.onBehalfOf.trim()) {
            setOnBehalfOfError("Player user ID is required.");
            valid = false;
        }
        return valid;
    };

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            const startDatetime = datetimeLocalToUTC(`${form.bookingDate}T${form.startTime}`);

            if (form.isRecurring) {
                const payload: RecurringBookingInput = {
                    club_id: clubId ?? "",
                    court_id: form.courtId,
                    booking_type: form.bookingType as BookingType,
                    first_start: startDatetime,
                    recurrence_rule: form.recurrenceRule,
                    max_players: parseOptionalNumber(form.maxPlayers) ?? undefined,
                    notes: form.notes.trim() || null,
                    event_name: form.eventName.trim() || null,
                    contact_name: form.contactName.trim() || null,
                    contact_email: form.contactEmail.trim() || null,
                    contact_phone: form.contactPhone.trim() || null,
                    skip_conflicts: form.skipConflicts,
                };
                createRecurringMutation.mutate(payload, {
                    onSuccess: () => {
                        onClose();
                        onSuccess?.();
                    },
                });
                return;
            }

            const invitedPlayerIds = form.isOpenGame
                ? []
                : form.playerUserIds.map((id) => id.trim()).filter(Boolean);
            const payload: BookingInput = {
                club_id: clubId ?? "",
                court_id: form.courtId,
                booking_type: form.bookingType as BookingType,
                start_datetime: startDatetime,
                is_open_game: form.isOpenGame,
                max_players: parseOptionalNumber(form.maxPlayers) ?? undefined,
                notes: form.notes.trim() || null,
                anchor_skill_level: parseOptionalNumber(form.anchorSkill),
                skill_level_override_min: parseOptionalNumber(form.skillMin),
                skill_level_override_max: parseOptionalNumber(form.skillMax),
                event_name: form.eventName.trim() || null,
                contact_name: form.contactName.trim() || null,
                contact_email: form.contactEmail.trim() || null,
                contact_phone: form.contactPhone.trim() || null,
                on_behalf_of_user_id: form.isOpenGame ? null : form.onBehalfOf.trim() || null,
                player_user_ids: invitedPlayerIds.length > 0 ? invitedPlayerIds : undefined,
                staff_profile_id: form.staffProfileId.trim() || null,
            };

            createMutation.mutate(payload, {
                onSuccess: () => {
                    onClose();
                    onSuccess?.();
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createMutation, createRecurringMutation, onClose]
    );

    return (
        <NewBookingView
            mode="modal"
            courtName={courtName}
            courts={courtList}
            trainers={trainerList}
            slots={slots}
            slotsLoading={slotsLoading}
            form={form}
            courtError={courtError}
            startError={startError}
            onBehalfOfError={onBehalfOfError}
            apiError={apiError}
            isPending={activeMutation.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={onClose}
            onClose={onClose}
            onDismissError={() => activeMutation.reset()}
            onRefreshSlots={() => void refetchSlots()}
            selectedPrice={selectedPrice}
        />
    );
}
