import { useState, useCallback, useMemo, useEffect } from "react";
import type { FormEvent, JSX } from "react";
import { datetimeLocalToUTC } from "@repo/ui";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
    useGetCalendarReservation,
    useUpdateCalendarReservation,
    useDeleteCalendarReservation,
    useListCourts,
} from "../../hooks";
import { useClubAccess, canManageReservation } from "../../store";
import type { CalendarReservation, CalendarReservationType } from "../../types";
import { ConfirmDeleteModal } from "@repo/ui";
import ManageReservationView from "./ManageReservationView";
import type { ManageReservationFormState } from "./ManageReservationView";

function toDatetimeLocal(iso: string): string {
    return iso.slice(0, 16);
}

function buildInitialForm(res: CalendarReservation): ManageReservationFormState {
    const startLocal = toDatetimeLocal(res.start_datetime);
    return {
        title: res.title,
        reservationType: res.reservation_type,
        courtId: res.court_id ?? "",
        date: startLocal.slice(0, 10),
        startTime: startLocal.slice(11, 16),
        endTime: toDatetimeLocal(res.end_datetime).slice(11, 16),
        allowedBookingTypes: res.allowed_booking_types ?? [],
        isRecurring: res.is_recurring ?? false,
        recurrenceRule: res.recurrence_rule ?? "",
        recurrenceEndDate: res.recurrence_end_date ?? "",
    };
}

export default function ManageReservationContainer(): JSX.Element {
    const { reservationId } = useParams({ strict: false }) as { reservationId: string };
    const navigate = useNavigate();
    const { clubId, role } = useClubAccess();
    const canEdit = canManageReservation(role);

    const { data: reservation, isLoading, error } = useGetCalendarReservation(reservationId);
    const { data: courts = [] } = useListCourts(clubId ?? "");

    const updateMutation = useUpdateCalendarReservation(clubId ?? "", reservationId);
    const deleteMutation = useDeleteCalendarReservation(clubId ?? "");

    const [form, setForm] = useState<ManageReservationFormState | null>(null);
    const [apiError, setApiError] = useState("");
    const [updateSuccess, setUpdateSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (reservation && form === null) {
            setForm(buildInitialForm(reservation as CalendarReservation));
        }
    }, [reservation, form]);

    const initialForm = useMemo(
        () => (reservation ? buildInitialForm(reservation as CalendarReservation) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [(reservation as CalendarReservation | undefined)?.id]
    );

    const isDirty = useMemo(() => {
        if (!form || !initialForm) return false;
        return (Object.keys(form) as (keyof ManageReservationFormState)[]).some(
            (k) => JSON.stringify(form[k]) !== JSON.stringify(initialForm[k])
        );
    }, [form, initialForm]);

    const handleFormChange = useCallback((patch: Partial<ManageReservationFormState>): void => {
        setForm((prev) => (prev ? { ...prev, ...patch } : prev));
    }, []);

    const handleSubmit = useCallback(
        (e: FormEvent): void => {
            e.preventDefault();
            if (!form) return;

            const startDatetimeLocal =
                form.date && form.startTime ? `${form.date}T${form.startTime}` : "";
            const endDatetimeLocal =
                form.date && form.endTime ? `${form.date}T${form.endTime}` : "";

            const payload = {
                title: form.title.trim() || undefined,
                reservation_type: form.reservationType as CalendarReservationType,
                court_id: form.courtId || null,
                start_datetime: startDatetimeLocal
                    ? datetimeLocalToUTC(startDatetimeLocal)
                    : undefined,
                end_datetime: endDatetimeLocal ? datetimeLocalToUTC(endDatetimeLocal) : undefined,
                allowed_booking_types: form.allowedBookingTypes.length
                    ? form.allowedBookingTypes
                    : null,
                is_recurring: form.isRecurring,
                recurrence_rule:
                    form.isRecurring && form.recurrenceRule.trim()
                        ? form.recurrenceRule.trim()
                        : null,
                recurrence_end_date:
                    form.isRecurring && form.recurrenceEndDate ? form.recurrenceEndDate : null,
            };

            updateMutation.mutate(payload, {
                onSuccess: () => {
                    setUpdateSuccess(true);
                    setApiError("");
                    setTimeout(() => setUpdateSuccess(false), 3000);
                },
                onError: (err) => {
                    setApiError(
                        err instanceof Error ? err.message : "Failed to update reservation."
                    );
                },
            });
        },
        [form, updateMutation]
    );

    const handleDelete = useCallback((): void => {
        setShowDeleteConfirm(true);
    }, []);

    const handleConfirmDelete = useCallback((): void => {
        deleteMutation.mutate(reservationId, {
            onSuccess: () => {
                void navigate({ to: "/reservations", search: { deleted: true } });
            },
            onError: (err) => {
                setShowDeleteConfirm(false);
                setApiError(err instanceof Error ? err.message : "Failed to delete reservation.");
            },
        });
    }, [reservationId, deleteMutation, navigate]);

    const handleBack = useCallback((): void => {
        void navigate({ to: "/reservations" });
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-3 py-20">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading reservation…</span>
            </div>
        );
    }

    if (error || !reservation || !form) {
        return (
            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error instanceof Error ? error.message : "Reservation not found."}
            </div>
        );
    }

    return (
        <>
            <ManageReservationView
                reservation={reservation as CalendarReservation}
                courts={courts as { id: string; name: string }[]}
                form={form}
                isDirty={isDirty}
                canEdit={canEdit}
                apiError={apiError}
                updateSuccess={updateSuccess}
                isUpdating={updateMutation.isPending}
                isDeleting={deleteMutation.isPending}
                onFormChange={handleFormChange}
                onSubmit={handleSubmit}
                onDelete={handleDelete}
                onDismissError={() => setApiError("")}
                onBack={handleBack}
            />

            {showDeleteConfirm ? (
                <ConfirmDeleteModal
                    title={`Delete "${(reservation as CalendarReservation).title}"?`}
                    description="This reservation will be permanently deleted. This action cannot be undone."
                    saving={deleteMutation.isPending}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            ) : null}
        </>
    );
}
