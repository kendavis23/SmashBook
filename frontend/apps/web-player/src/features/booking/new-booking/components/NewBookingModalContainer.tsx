import { useState, useCallback, useEffect, useRef } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import {
    useCreateBooking,
    useGetCourtAvailability,
    useListCourts,
    useListAvailableTrainers,
} from "../../hooks";
import { useClubAccess } from "../../store";
import type { BookingInput, BookingType } from "../../types";
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

    const {
        data: availabilityData,
        isLoading: slotsLoading,
        refetch: refetchSlots,
    } = useGetCourtAvailability(form.courtId, form.bookingDate);
    const slots = availabilityData?.slots ?? [];
    const selectedSlot = slots.find((s) => s.start_time === form.startTime);
    const selectedPrice = selectedSlot?.price ?? null;

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
        if (form.staffProfileId && !trainerData.some((t) => t.staff_profile_id === form.staffProfileId)) {
            setForm((prev) => ({ ...prev, staffProfileId: "" }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [trainerData]);

    const createMutation = useCreateBooking(clubId ?? "");
    const apiError = (createMutation.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback(
        (patch: Partial<NewBookingFormState>): void => {
            setForm((prev) => {
                const next = { ...prev, ...patch };
                if (patch.bookingType !== undefined) {
                    next.isOpenGame = false;
                    if (patch.bookingType === "lesson_individual") {
                        next.maxPlayers = "1";
                    }
                }
                if (patch.courtId !== undefined && courtError) setCourtError("");
                if (
                    (patch.bookingDate !== undefined || patch.startTime !== undefined) &&
                    startError
                )
                    setStartError("");
                return next;
            });
        },
        [courtError, startError]
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
        return valid;
    };

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            const startDatetime = datetimeLocalToUTC(`${form.bookingDate}T${form.startTime}`);

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
                onSuccess: () => {
                    onClose();
                    onSuccess?.();
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createMutation, onClose]
    );

    return (
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
            apiError={apiError}
            isPending={createMutation.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={onClose}
            onClose={onClose}
            onDismissError={() => createMutation.reset()}
            onRefreshSlots={() => void refetchSlots()}
            selectedPrice={selectedPrice}
            clubId={clubId}
        />
    );
}
