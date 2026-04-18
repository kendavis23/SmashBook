import { useState, useCallback, useMemo, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
    useGetBooking,
    useUpdateBooking,
    useCancelBooking,
    useListCourts,
    useGetCourtAvailability,
} from "../../hooks";
import { useClubAccess } from "../../store";
import type { Booking } from "../../types";
import ManageBookingView from "./ManageBookingView";
import type { ManageBookingFormState } from "./ManageBookingView";

function buildInitialForm(booking: Booking): ManageBookingFormState {
    return {
        courtId: booking.court_id,
        bookingDate: booking.start_datetime.slice(0, 10),
        startTime: booking.start_datetime.slice(11, 16),
        notes: booking.notes ?? "",
        eventName: booking.event_name ?? "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
    };
}

export default function ManageBookingContainer(): JSX.Element {
    const { bookingId } = useParams({ strict: false }) as { bookingId: string };
    const navigate = useNavigate();
    const { clubId } = useClubAccess();

    const { data: booking, isLoading, error } = useGetBooking(bookingId, clubId ?? "");

    const { data: courts = [] } = useListCourts(clubId ?? "");

    const updateMutation = useUpdateBooking(clubId ?? "", bookingId);
    const cancelMutation = useCancelBooking(clubId ?? "");

    const [form, setForm] = useState<ManageBookingFormState | null>(null);

    const { data: availabilityData, isLoading: slotsLoading } = useGetCourtAvailability(
        form?.courtId ?? "",
        form?.bookingDate ?? ""
    );
    const slots = availabilityData?.slots ?? [];
    const [apiError, setApiError] = useState("");
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    // Initialise form once booking loads — never re-run on re-renders
    useEffect(() => {
        if (booking && form === null) {
            setForm(buildInitialForm(booking as Booking));
        }
    }, [booking, form]);

    const initialForm = useMemo(
        () => (booking ? buildInitialForm(booking as Booking) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [booking?.id] // only recompute when a different booking loads
    );

    const isDirty = useMemo(() => {
        if (!form || !initialForm) return false;
        return (Object.keys(form) as (keyof ManageBookingFormState)[]).some(
            (k) => form[k] !== initialForm[k]
        );
    }, [form, initialForm]);

    const handleFormChange = useCallback((patch: Partial<ManageBookingFormState>): void => {
        setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    }, []);

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!form) return;

            const startDatetimeLocal =
                form.bookingDate && form.startTime ? `${form.bookingDate}T${form.startTime}` : null;

            const payload = {
                court_id: form.courtId || undefined,
                start_datetime: startDatetimeLocal
                    ? datetimeLocalToUTC(startDatetimeLocal)
                    : undefined,
                notes: form.notes.trim() || null,
                event_name: form.eventName.trim() || null,
                contact_name: form.contactName.trim() || null,
                contact_email: form.contactEmail.trim() || null,
                contact_phone: form.contactPhone.trim() || null,
            };

            updateMutation.mutate(payload, {
                onSuccess: () => {
                    setUpdateSuccess(true);
                    setApiError("");
                    setTimeout(() => setUpdateSuccess(false), 3000);
                },
                onError: (err) => {
                    setApiError(
                        (err as { message?: string })?.message || "Failed to update booking."
                    );
                },
            });
        },
        [form, updateMutation]
    );

    const handleCancelBooking = useCallback((): void => {
        setShowCancelConfirm(true);
    }, []);

    const handleConfirmCancel = useCallback((): void => {
        cancelMutation.mutate(bookingId, {
            onSuccess: () => {
                setShowCancelConfirm(false);
                void navigate({ to: "/bookings" });
            },
            onError: (err) => {
                setShowCancelConfirm(false);
                setApiError(err instanceof Error ? err.message : "Failed to cancel booking.");
            },
        });
    }, [bookingId, cancelMutation, navigate]);

    const handleBack = useCallback((): void => {
        void navigate({ to: "/bookings" });
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading booking…</span>
            </div>
        );
    }

    if (error || !booking || !form) {
        return (
            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "Booking not found."}
            </div>
        );
    }

    return (
        <ManageBookingView
            booking={booking as Booking}
            courts={courts as { id: string; name: string }[]}
            slots={slots}
            slotsLoading={slotsLoading}
            form={form}
            isDirty={isDirty}
            apiError={apiError}
            updateSuccess={updateSuccess}
            isUpdating={updateMutation.isPending}
            isCancelling={cancelMutation.isPending}
            showCancelConfirm={showCancelConfirm}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onCancelBooking={handleCancelBooking}
            onConfirmCancel={handleConfirmCancel}
            onDismissCancelConfirm={() => setShowCancelConfirm(false)}
            onDismissError={() => setApiError("")}
            onBack={handleBack}
        />
    );
}
