import type { JSX, ElementType } from "react";
import { useState, useMemo } from "react";
import {
    Clock,
    CalendarDays,
    Layers,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    FileText,
} from "lucide-react";
import { AlertToast, ConfirmDeleteModal } from "@repo/ui";
import type { TrainerAvailability } from "../../types";
import { DAY_LABELS } from "../../types";
import { formatTime } from "../../utils";

// ─── constants ───────────────────────────────────────────────────────────────

const HOUR_START = 5; // 5 AM
const HOUR_END = 23; // 11 PM
const TOTAL_HOURS = HOUR_END - HOUR_START; // 18 hours
const ROW_HEIGHT_PX = 26; // 26 px/hr → 18 × 26 = 468 px total, no scroll needed
const TOP_PAD_PX = 10; // breathing room so the first (5a) label isn't clipped by the header
const BOTTOM_PAD_PX = 10; // breathing room so the last (11p) label isn't clipped by the border

// ─── pure helpers ────────────────────────────────────────────────────────────

function timeToMinutes(hhmm: string): number {
    const [h = "0", m = "0"] = hhmm.split(":");
    return Number(h) * 60 + Number(m);
}

function weekStart(date: Date): Date {
    const d = new Date(date);
    const dow = (d.getDay() + 6) % 7; // 0=Mon
    d.setDate(d.getDate() - dow);
    return d;
}

function addDays(date: Date, n: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function isSlotActive(slot: TrainerAvailability, date: Date): boolean {
    const s = isoDate(date);
    if (s < slot.effective_from) return false;
    if (slot.effective_until && s > slot.effective_until) return false;
    return true;
}

function hourLabel(h: number): string {
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ─── Notes popover ───────────────────────────────────────────────────────────

function NotesPopover({ notes }: { notes: string }): JSX.Element {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative inline-flex">
            <button
                type="button"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                className="flex h-4 w-4 items-center justify-center rounded text-blue-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                aria-label="View notes"
            >
                <FileText size={11} strokeWidth={2.25} />
            </button>
            {open && (
                <div className="absolute bottom-full left-1/2 z-50 mb-1.5 w-48 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-lg">
                    <p className="text-[10px] leading-relaxed text-slate-600 break-words">
                        {notes}
                    </p>
                    <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-200" />
                </div>
            )}
        </div>
    );
}

// ─── Slot block ───────────────────────────────────────────────────────────────

function SlotBlock({
    slot,
    canManage,
    onDelete,
    deleting,
    expired,
}: {
    slot: TrainerAvailability;
    canManage: boolean;
    onDelete: (slot: TrainerAvailability) => void;
    deleting: boolean;
    expired: boolean;
}): JSX.Element {
    const gridStart = HOUR_START * 60;
    const topPx = TOP_PAD_PX + ((timeToMinutes(slot.start_time) - gridStart) / 60) * ROW_HEIGHT_PX;
    const heightPx = Math.max(
        ((timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time)) / 60) * ROW_HEIGHT_PX,
        18
    );
    const tiny = heightPx < 30;

    return (
        <div
            className={`group/slot absolute inset-x-[3px] rounded-md overflow-hidden select-none transition-all ${
                expired
                    ? "opacity-40 bg-slate-100 border border-slate-200"
                    : "bg-gradient-to-b from-blue-50 to-blue-100/70 border border-blue-200 shadow-sm hover:shadow hover:border-blue-300"
            }`}
            style={{ top: topPx, height: heightPx }}
            title={`${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}${expired ? " (expired)" : ""}`}
        >
            <div className="flex h-full items-start justify-between gap-1 px-1.5 pt-[3px]">
                <span
                    className={`font-semibold tabular-nums leading-tight ${
                        expired ? "text-slate-400" : "text-blue-800"
                    } ${tiny ? "text-[8px]" : "text-[9px]"}`}
                >
                    {formatTime(slot.start_time)}
                    {!tiny && (
                        <span className="font-medium text-blue-500">
                            {" "}
                            – {formatTime(slot.end_time)}
                        </span>
                    )}
                </span>
                {!tiny && (
                    <div className="flex items-center gap-1 shrink-0">
                        {slot.notes?.trim() && <NotesPopover notes={slot.notes} />}
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => onDelete(slot)}
                                disabled={deleting}
                                className="flex h-4 w-4 items-center justify-center rounded text-blue-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors"
                                aria-label="Delete slot"
                            >
                                <Trash2 size={11} strokeWidth={2.25} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Stats pill ───────────────────────────────────────────────────────────────

function Stat({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: ElementType;
    label: string;
    value: string;
    color: string;
}): JSX.Element {
    return (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${color}`}>
            <Icon size={12} />
            <span className="text-[11px] font-medium">{label}</span>
            <span className="text-[11px] font-bold">{value}</span>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

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

export function TrainerAvailabilityCalendar({
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
    const [weekOffset, setWeekOffset] = useState(0);

    const monday = useMemo(() => {
        const base = weekStart(new Date());
        return addDays(base, weekOffset * 7);
    }, [weekOffset]);

    const weekDates = useMemo(
        () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
        [monday]
    );

    const today = isoDate(new Date());

    const slotsByDay = useMemo(
        () =>
            weekDates.map((_, dayIndex) => availability.filter((s) => s.day_of_week === dayIndex)),
        [availability, weekDates]
    );

    const activeSlots = useMemo(
        () =>
            weekDates.flatMap((date, i) =>
                (slotsByDay[i] ?? []).filter((s) => isSlotActive(s, date))
            ),
        [weekDates, slotsByDay]
    );

    const totalHours = useMemo(() => {
        const mins = activeSlots.reduce(
            (sum, s) => sum + timeToMinutes(s.end_time) - timeToMinutes(s.start_time),
            0
        );
        return (mins / 60).toFixed(1).replace(/\.0$/, "");
    }, [activeSlots]);

    const activeDays = useMemo(
        () =>
            weekDates.filter((date, i) => (slotsByDay[i] ?? []).some((s) => isSlotActive(s, date)))
                .length,
        [weekDates, slotsByDay]
    );

    function handleDeleteConfirm() {
        if (!slotToDelete) return;
        void onDelete(slotToDelete.id).then(() => setSlotToDelete(null));
    }

    const hourTicks = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

    const weekLabel = `${monday.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${addDays(monday, 6).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

    const GUTTER = 52; // px — left gutter for hour labels ("11 PM" needs room)
    const GRID_HEIGHT = TOTAL_HOURS * ROW_HEIGHT_PX + TOP_PAD_PX + BOTTOM_PAD_PX;

    return (
        <div className="space-y-3">
            {slotToDelete && (
                <ConfirmDeleteModal
                    title="Delete Availability Slot"
                    description={`Delete the ${formatTime(slotToDelete.start_time)} – ${formatTime(slotToDelete.end_time)} slot on ${DAY_LABELS[slotToDelete.day_of_week]}? This cannot be undone.`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setSlotToDelete(null)}
                    saving={deletingAvailabilityId === slotToDelete.id}
                />
            )}

            {/* ── toolbar ── */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                {/* week navigator */}
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setWeekOffset((o) => o - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
                        aria-label="Previous week"
                    >
                        <ChevronLeft size={12} />
                    </button>
                    <span className="min-w-[160px] text-center text-[11px] font-medium text-slate-600">
                        {weekLabel}
                    </span>
                    <button
                        type="button"
                        onClick={() => setWeekOffset((o) => o + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
                        aria-label="Next week"
                    >
                        <ChevronRight size={12} />
                    </button>
                    {weekOffset !== 0 && (
                        <button
                            type="button"
                            onClick={() => setWeekOffset(0)}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                            Today
                        </button>
                    )}
                </div>

                {/* actions */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onRefresh}
                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
                        aria-label="Refresh"
                    >
                        Refresh
                    </button>
                    {canManage && (
                        <button
                            onClick={onCreate}
                            className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-700 transition-colors"
                            aria-label="Create availability"
                        >
                            <Plus size={11} />
                            Add Slot
                        </button>
                    )}
                </div>
            </div>

            {availabilityError && (
                <AlertToast
                    title={availabilityError.message ?? "Failed to load availability."}
                    variant="error"
                    onClose={onRefresh}
                />
            )}

            {availabilityLoading ? (
                <div className="flex items-center justify-center gap-2 py-10">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                    <span className="text-xs text-slate-400">Loading…</span>
                </div>
            ) : (
                <>
                    {/* ── calendar grid ── */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* day header row */}
                        <div className="flex border-b border-slate-200 bg-slate-50">
                            {/* gutter spacer — must match body gutter width */}
                            <div
                                className="shrink-0 border-r border-slate-200"
                                style={{ width: GUTTER }}
                            />
                            {/* day cells — flex-1 each, same as body columns */}
                            <div className="flex flex-1">
                                {weekDates.map((date, i) => {
                                    const isToday = isoDate(date) === today;
                                    const isWeekend = i >= 5;
                                    const hasActive = (slotsByDay[i] ?? []).some((s) =>
                                        isSlotActive(s, date)
                                    );
                                    return (
                                        <div
                                            key={i}
                                            className={`flex flex-1 flex-col items-center py-1.5 border-r border-slate-200 last:border-r-0 ${isWeekend ? "bg-slate-100/60" : ""}`}
                                        >
                                            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                                                {DAY_LABELS[i]?.slice(0, 3)}
                                            </span>
                                            <span
                                                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                                                    isToday
                                                        ? "bg-blue-600 text-white"
                                                        : isWeekend
                                                          ? "text-slate-400"
                                                          : "text-slate-700"
                                                }`}
                                            >
                                                {date.getDate()}
                                            </span>
                                            <div
                                                className={`mt-0.5 h-1 w-1 rounded-full ${hasActive ? "bg-blue-400" : "opacity-0"}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* time grid — full height, no scroll */}
                        <div>
                            <div className="flex" style={{ height: GRID_HEIGHT }}>
                                {/* ── gutter: hour labels ── */}
                                <div
                                    className="relative shrink-0 border-r border-slate-200 bg-white"
                                    style={{ width: GUTTER }}
                                >
                                    {hourTicks.map((h, idx) => (
                                        <div
                                            key={h}
                                            className="absolute right-0 left-0 flex items-center justify-end pr-2.5"
                                            style={{
                                                top: TOP_PAD_PX + idx * ROW_HEIGHT_PX - 6,
                                                height: 12,
                                            }}
                                        >
                                            <span className="text-[9px] font-semibold tabular-nums text-slate-400 leading-none whitespace-nowrap">
                                                {hourLabel(h)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* ── day columns ── */}
                                <div className="relative flex flex-1">
                                    {/* horizontal gridlines across all day columns */}
                                    {hourTicks.map((h, idx) => (
                                        <div
                                            key={`hline-${h}`}
                                            className="pointer-events-none absolute left-0 right-0 border-t border-slate-100"
                                            style={{ top: TOP_PAD_PX + idx * ROW_HEIGHT_PX }}
                                        />
                                    ))}

                                    {weekDates.map((date, dayIndex) => {
                                        const daySlots = slotsByDay[dayIndex] ?? [];
                                        const isWeekend = dayIndex >= 5;
                                        return (
                                            <div
                                                key={dayIndex}
                                                className={`relative flex-1 border-r border-slate-100 last:border-r-0 ${isWeekend ? "bg-slate-50/60" : ""}`}
                                            >
                                                {daySlots.map((slot) => (
                                                    <SlotBlock
                                                        key={slot.id}
                                                        slot={slot}
                                                        canManage={canManage}
                                                        onDelete={setSlotToDelete}
                                                        deleting={
                                                            deletingAvailabilityId === slot.id
                                                        }
                                                        expired={!isSlotActive(slot, date)}
                                                    />
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── stats bar ── */}
                    <div className="flex flex-wrap gap-2">
                        <Stat
                            icon={Clock}
                            label="Hours"
                            value={`${totalHours} hrs`}
                            color="border-blue-100 bg-blue-50 text-blue-700"
                        />
                        <Stat
                            icon={CalendarDays}
                            label="Days"
                            value={`${activeDays}`}
                            color="border-emerald-100 bg-emerald-50 text-emerald-700"
                        />
                        <Stat
                            icon={Layers}
                            label="Slots"
                            value={`${activeSlots.length}`}
                            color="border-violet-100 bg-violet-50 text-violet-700"
                        />
                    </div>
                </>
            )}
        </div>
    );
}
