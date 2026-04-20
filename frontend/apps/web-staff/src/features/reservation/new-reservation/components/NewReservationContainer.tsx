import { useState, useCallback, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import { useNavigate } from "@tanstack/react-router";
import { useCreateCalendarReservation, useListCourts } from "../../hooks";
import { useClubAccess } from "../../store";
import type { CalendarReservationInput, CalendarReservationType, Court } from "../../types";
import NewReservationView from "./NewReservationView";
import type { NewReservationFormState } from "./NewReservationView";

function parseOptionalNumber(val: string): number | null {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
}

function createDefaultForm(): NewReservationFormState {
    return {
        title: "",
        reservationType: "maintenance",
        courtId: "",
        date: "",
        startTime: "",
        endTime: "",
        anchorSkillLevel: "",
        skillRangeAbove: "",
        skillRangeBelow: "",
        allowedBookingTypes: [],
        isRecurring: false,
        recurrenceRule: "",
        recurrenceEndDate: "",
    };
}

export default function NewReservationContainer(): JSX.Element {
    const navigate = useNavigate();
    const { clubId } = useClubAccess();

    const { data: courts = [] } = useListCourts(clubId ?? "");

    const [form, setForm] = useState<NewReservationFormState>(createDefaultForm);
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
                anchor_skill_level: parseOptionalNumber(form.anchorSkillLevel),
                skill_range_above: parseOptionalNumber(form.skillRangeAbove),
                skill_range_below: parseOptionalNumber(form.skillRangeBelow),
                allowed_booking_types:
                    form.allowedBookingTypes.length > 0 ? form.allowedBookingTypes : null,
                is_recurring: form.isRecurring,
                recurrence_rule: form.recurrenceRule || null,
                recurrence_end_date: form.recurrenceEndDate || null,
            };

            createMutation.mutate(payload, {
                onSuccess: () => {
                    void navigate({ to: "/reservations", search: { created: true } });
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createMutation, navigate]
    );

    const handleCancel = useCallback((): void => {
        void navigate({ to: "/reservations" });
    }, [navigate]);

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
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={handleDismissError}
        />
    );
}
