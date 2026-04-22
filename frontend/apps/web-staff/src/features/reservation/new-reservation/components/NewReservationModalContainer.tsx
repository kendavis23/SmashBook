import { useState, useCallback, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import { useCreateCalendarReservation, useListCourts } from "../../hooks";
import { useClubAccess } from "../../store";
import type { CalendarReservationInput, CalendarReservationType, Court } from "../../types";
import NewReservationView from "./NewReservationView";
import type { NewReservationFormState } from "./NewReservationView";

function createDefaultForm(
    courtId?: string,
    date?: string,
    startTime?: string,
    endTime?: string
): NewReservationFormState {
    return {
        title: "",
        reservationType: "maintenance",
        courtId: courtId ?? "",
        date: date ?? "",
        startTime: startTime ?? "",
        endTime: endTime ?? "",
        allowedBookingTypes: [],
        isRecurring: false,
        recurrenceRule: "",
        recurrenceEndDate: "",
    };
}

type Props = {
    onClose: () => void;
    onSuccess?: () => void;
    courtId?: string;
    courtName?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
};

export default function NewReservationModalContainer({
    onClose,
    onSuccess,
    courtId,
    courtName,
    date,
    startTime,
    endTime,
}: Props): JSX.Element {
    const { clubId } = useClubAccess();
    const { data: courts = [] } = useListCourts(clubId ?? "");

    const [form, setForm] = useState<NewReservationFormState>(() =>
        createDefaultForm(courtId, date, startTime, endTime)
    );
    const [titleError, setTitleError] = useState("");
    const [timeError, setTimeError] = useState("");

    useEffect(() => {
        const firstCourt = courts[0];
        if (firstCourt && !form.courtId) {
            setForm((prev) => ({ ...prev, courtId: firstCourt.id }));
        }
    }, [courts]);

    const createMutation = useCreateCalendarReservation(clubId ?? "");
    const apiError = (createMutation.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback((patch: Partial<NewReservationFormState>): void => {
        setForm((prev) => {
            const next = { ...prev, ...patch };
            if (patch.title !== undefined && patch.title.trim()) setTitleError("");
            if (patch.startTime !== undefined || patch.endTime !== undefined) {
                if (next.startTime && next.endTime && next.startTime < next.endTime) {
                    setTimeError("");
                }
            }
            return next;
        });
    }, []);

    const validate = (): boolean => {
        let valid = true;
        if (!form.title.trim()) {
            setTitleError("Title is required.");
            valid = false;
        } else {
            setTitleError("");
        }
        if (!form.date || !form.startTime || !form.endTime) {
            setTimeError("Date, start time, and end time are required.");
            valid = false;
        } else if (form.startTime >= form.endTime) {
            setTimeError("End time must be after start time.");
            valid = false;
        } else {
            setTimeError("");
        }
        return valid;
    };

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!validate()) return;

            const startDatetimeLocal = `${form.date}T${form.startTime}`;
            const endDatetimeLocal = `${form.date}T${form.endTime}`;

            const payload: CalendarReservationInput = {
                club_id: clubId ?? "",
                court_id: form.courtId || null,
                reservation_type: form.reservationType as CalendarReservationType,
                title: form.title.trim(),
                start_datetime: datetimeLocalToUTC(startDatetimeLocal),
                end_datetime: datetimeLocalToUTC(endDatetimeLocal),
                allowed_booking_types:
                    form.allowedBookingTypes.length > 0 ? form.allowedBookingTypes : null,
                is_recurring: form.isRecurring,
                recurrence_rule: form.recurrenceRule || null,
                recurrence_end_date: form.recurrenceEndDate || null,
            };

            createMutation.mutate(payload, {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createMutation, onClose, onSuccess]
    );

    const handleCancel = useCallback((): void => {
        onClose();
    }, [onClose]);

    const handleDismissError = useCallback((): void => {
        createMutation.reset();
    }, [createMutation]);

    return (
        <NewReservationView
            courts={courts as Court[]}
            form={form}
            titleError={titleError}
            timeError={timeError}
            apiError={apiError}
            isPending={createMutation.isPending}
            variant="modal"
            lockedCourtName={courtName}
            lockedDate={date}
            lockedStartTime={startTime}
            lockedEndTime={endTime}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onClose={onClose}
            onDismissError={handleDismissError}
        />
    );
}
