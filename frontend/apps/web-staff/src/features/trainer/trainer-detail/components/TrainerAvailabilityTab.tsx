import type { JSX } from "react";
import { useState } from "react";
import { Clock, Calendar, FileText, Trash2, Plus } from "lucide-react";
import { AlertToast, ConfirmDeleteModal } from "@repo/ui";
import { formatUTCDate } from "@repo/ui";
import type { TrainerAvailability } from "../../types";
import { DAY_LABELS } from "../../types";
import { formatTime } from "../../utils";

function compareAvailabilitySlot(a: TrainerAvailability, b: TrainerAvailability): number {
    const effectiveFromCompare = a.effective_from.localeCompare(b.effective_from);
    if (effectiveFromCompare !== 0) return effectiveFromCompare;
    return a.start_time.localeCompare(b.start_time);
}

function groupAvailabilityByDay(availability: TrainerAvailability[]): TrainerAvailability[][] {
    const grouped = Array.from({ length: 7 }, () => [] as TrainerAvailability[]);
    availability.forEach((slot) => {
        if (slot.day_of_week >= 0 && slot.day_of_week <= 6) {
            grouped[slot.day_of_week]?.push(slot);
        }
    });
    return grouped.map((slots) => [...slots].sort(compareAvailabilitySlot));
}

function NotesTooltip({ notes }: { notes: string }): JSX.Element {
    const [visible, setVisible] = useState(false);
    const hasNotes = !!notes?.trim();

    return (
        <div className="relative inline-flex w-4 justify-center">
            <button
                type="button"
                onMouseEnter={() => hasNotes && setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                className={`flex items-center justify-center rounded ${hasNotes
                    ? "text-muted-foreground hover:text-foreground"
                    : "opacity-0 pointer-events-none"
                    }`}
                aria-label="View notes"
            >
                <FileText size={11} />
            </button>

            {visible && hasNotes && (
                <div className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-md border border-border bg-white dark:bg-zinc-900 px-3 py-2 shadow-md">
                    <p className="text-[11px] leading-relaxed text-popover-foreground break-words">
                        {notes}
                    </p>
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-border" />
                </div>
            )}
        </div>
    );
}

function AvailabilitySlotPill({
    slot,
    canManage,
    onDelete,
    deleting,
}: {
    slot: TrainerAvailability;
    canManage: boolean;
    onDelete: (slot: TrainerAvailability) => void;
    deleting: boolean;
}): JSX.Element {
    const timeLabel = `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`;
    const fromLabel = `From ${formatUTCDate(slot.effective_from)}`;
    const untilLabel = slot.effective_until ? `Until ${formatUTCDate(slot.effective_until)}` : null;

    return (
        <article className="rounded-lg border border-border bg-background shadow-sm">
            {/* Time header */}
            <div className="flex items-center gap-2 bg-cta/5 px-3 py-2 rounded-t-lg">
                <Clock size={12} className="shrink-0 text-cta" />
                <span className="text-xs font-semibold tabular-nums text-foreground">
                    {timeLabel}
                </span>
            </div>
            {/* Date info */}
            <div className="px-3 py-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                    <Calendar size={10} className="shrink-0" />
                    <span>{fromLabel}</span>
                </div>
                {untilLabel ? (
                    <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
                        <Calendar size={10} className="shrink-0" />
                        <span>{untilLabel}</span>
                    </div>
                ) : null}
            </div>
            {/* Actions footer */}
            {(canManage || slot.notes?.trim()) ? (
                <div className="flex items-center justify-end gap-1.5 border-t border-border/60 px-3 py-1.5">
                    <NotesTooltip notes={slot.notes || ""} />
                    {canManage ? (
                        <button
                            type="button"
                            onClick={() => onDelete(slot)}
                            disabled={deleting}
                            className="flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
                            aria-label="Delete availability slot"
                        >
                            <Trash2 size={11} />
                        </button>
                    ) : null}
                </div>
            ) : null}
        </article>
    );
}

function AvailabilityDayRow({
    dayIndex,
    slots,
    canManage,
    onDeleteSlot,
    deletingId,
}: {
    dayIndex: number;
    slots: TrainerAvailability[];
    canManage: boolean;
    onDeleteSlot: (slot: TrainerAvailability) => void;
    deletingId: string | null;
}): JSX.Element {
    const shortLabel = DAY_LABELS[dayIndex]?.slice(0, 3) ?? `Day ${dayIndex + 1}`;

    return (
        <section className="flex items-start gap-4 rounded-lg border border-border bg-muted/10 p-2.5">
            <header className="shrink-0">
                <div className="flex flex-col items-start gap-1">
                    <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-md bg-cta/10 text-xs font-semibold uppercase text-cta">
                        {shortLabel}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                        {slots.length > 0
                            ? `${slots.length} ${slots.length === 1 ? "slot" : "slots"}`
                            : "No slots"}
                    </p>
                </div>
            </header>
            <div className="min-w-0">
                {slots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {slots.map((slot) => (
                            <AvailabilitySlotPill
                                key={slot.id}
                                slot={slot}
                                canManage={canManage}
                                onDelete={onDeleteSlot}
                                deleting={deletingId === slot.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                        No availability for {DAY_LABELS[dayIndex]}.
                    </div>
                )}
            </div>
        </section>
    );
}

type Props = {
    availability: TrainerAvailability[];
    availabilityLoading: boolean;
    availabilityError: Error | null;
    canManage: boolean;
    deletingAvailabilityId: string | null;
    onRefresh: () => void;
    onCreate: () => void;
    onDelete: (availabilityId: string) => Promise<void>;
};

export function TrainerAvailabilityTab({
    availability,
    availabilityLoading,
    availabilityError,
    canManage,
    deletingAvailabilityId,
    onRefresh,
    onCreate,
    onDelete,
}: Props): JSX.Element {
    const [slotToDelete, setSlotToDelete] = useState<TrainerAvailability | null>(null);
    const groupedAvailability = groupAvailabilityByDay(availability);

    function handleDeleteConfirm() {
        if (!slotToDelete) return;
        void onDelete(slotToDelete.id).then(() => setSlotToDelete(null));
    }

    return (
        <div className="space-y-4">
            {slotToDelete ? (
                <ConfirmDeleteModal
                    title="Delete Availability Slot"
                    description={`Delete the ${formatTime(slotToDelete.start_time)} – ${formatTime(slotToDelete.end_time)} slot? This cannot be undone.`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setSlotToDelete(null)}
                    saving={deletingAvailabilityId === slotToDelete.id}
                />
            ) : null}

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Weekly Availability</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Day-wise trainer availability sorted by effective date.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        className="btn-outline px-3 py-1.5 text-xs"
                        aria-label="Refresh availability"
                    >
                        Refresh
                    </button>
                    {canManage ? (
                        <button
                            onClick={onCreate}
                            className="btn-cta flex items-center gap-1 px-3 py-1.5 text-xs"
                            aria-label="Create availability"
                        >
                            <Plus size={12} />
                            Create Availability
                        </button>
                    ) : null}
                </div>
            </div>

            {availabilityError ? (
                <AlertToast
                    title={availabilityError.message ?? "Failed to load availability."}
                    variant="error"
                    onClose={onRefresh}
                />
            ) : null}

            {availabilityLoading ? (
                <div className="flex items-center justify-center gap-3 py-12">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-sm text-muted-foreground">Loading availability…</span>
                </div>
            ) : availability.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Clock size={18} />
                    </div>
                    <p className="text-sm font-medium text-foreground">No availability set</p>
                    <p className="text-sm text-muted-foreground">
                        This trainer has no availability slots configured.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {groupedAvailability.map((slots, dayIndex) => (
                        <AvailabilityDayRow
                            key={dayIndex}
                            dayIndex={dayIndex}
                            slots={slots}
                            canManage={canManage}
                            onDeleteSlot={setSlotToDelete}
                            deletingId={deletingAvailabilityId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
