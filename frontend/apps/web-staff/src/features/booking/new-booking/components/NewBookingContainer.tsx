import { useState, useCallback, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCreateBooking, useListCourts, useGetCourtAvailability } from "../../hooks";
import { useClubAccess } from "../../store";
import type { BookingInput, BookingType } from "../../types";
import NewBookingView from "./NewBookingView";
import type { NewBookingFormState } from "./NewBookingView";

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
    };
}

export default function NewBookingContainer(): JSX.Element {
    const navigate = useNavigate();
    const { clubId } = useClubAccess();
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

    const {
        data: availabilityData,
        isLoading: slotsLoading,
        refetch: refetchSlots,
    } = useGetCourtAvailability(form.courtId, form.bookingDate);
    const slots = availabilityData?.slots ?? [];
    const selectedPrice = slots.find((s) => s.start_time === form.startTime)?.price ?? null;

    // Auto-select the first available slot whenever availability data arrives (fresh)
    useEffect(() => {
        if (slotsLoading || slots.length === 0) return;
        const first = slots.find((s) => s.is_available);
        setForm((prev) => ({ ...prev, startTime: first?.start_time ?? "" }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availabilityData]);

    const createMutation = useCreateBooking(clubId ?? "");
    const apiError = (createMutation.error as Error | null)?.message ?? "";

    const handleFormChange = useCallback(
        (patch: Partial<NewBookingFormState>): void => {
            setForm((prev) => {
                const next = { ...prev, ...patch };
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

            // Combine date + time into an ISO datetime string
            const startDatetime = datetimeLocalToUTC(`${form.bookingDate}T${form.startTime}`);

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
                on_behalf_of_user_id: form.onBehalfOf.trim() || null,
            };

            createMutation.mutate(payload, {
                onSuccess: () => {
                    void navigate({ to: "/bookings", search: { created: true } });
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [form, clubId, createMutation, navigate]
    );

    const handleCancel = useCallback((): void => {
        void navigate({ to: "/bookings" });
    }, [navigate]);

    const handleDismissError = useCallback((): void => {
        createMutation.reset();
    }, [createMutation]);

    return (
        <NewBookingView
            courts={courtList}
            slots={slots}
            slotsLoading={slotsLoading}
            form={form}
            courtError={courtError}
            startError={startError}
            apiError={apiError}
            isPending={createMutation.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            onDismissError={handleDismissError}
            onRefreshSlots={() => void refetchSlots()}
            selectedPrice={selectedPrice}
        />
    );
}
