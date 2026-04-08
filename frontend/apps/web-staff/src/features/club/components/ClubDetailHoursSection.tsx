import { useGetOperatingHours, useSetOperatingHours } from "../hooks";
import type { OperatingHours } from "../types";
import { AlertToast } from "@repo/ui";
import { type JSX, useEffect, useState } from "react";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEFAULT_OPEN = "08:00";
const DEFAULT_CLOSE = "22:00";

type DayRow = {
    day_of_week: number;
    isOpen: boolean;
    open_time: string;
    close_time: string;
};

function buildDefaultRows(existing: OperatingHours[]): DayRow[] {
    return DAY_NAMES.map((_, day) => {
        const found = existing.find((e) => e.day_of_week === day);
        return {
            day_of_week: day,
            isOpen: !!found,
            open_time: found?.open_time ?? DEFAULT_OPEN,
            close_time: found?.close_time ?? DEFAULT_CLOSE,
        };
    });
}

interface HoursEditorProps {
    initialRows: DayRow[];
    isPending: boolean;
    isSuccess: boolean;
    onSave: (payload: OperatingHours[], onSuccess: () => void) => void;
}

function HoursEditor({ initialRows, isPending, isSuccess, onSave }: HoursEditorProps): JSX.Element {
    const [rows, setRows] = useState<DayRow[]>(() => initialRows);
    const [dirty, setDirty] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setDismissed(false);
    }, [isSuccess]);

    function updateRow(day: number, patch: Partial<DayRow>): void {
        setDirty(true);
        setRows((prev) =>
            prev.map((row) => (row.day_of_week === day ? { ...row, ...patch } : row))
        );
    }

    function handleSave(): void {
        const payload: OperatingHours[] = rows
            .filter((row) => row.isOpen)
            .map(({ day_of_week, open_time, close_time }) => ({
                day_of_week,
                open_time,
                close_time,
            }));

        onSave(payload, () => setDirty(false));
    }

    return (
        <>
            {/* ── Top action bar ── */}
            <div className="flex items-center justify-between pb-2">
                {isSuccess && !dirty && !dismissed ? (
                    <AlertToast title="Operating hours saved." variant="success" onClose={() => setDismissed(true)} />
                ) : (
                    <span />
                )}
                <button onClick={handleSave} disabled={isPending || !dirty} className="btn-cta">
                    {isPending ? "Saving…" : "Save Changes"}
                </button>
            </div>

            {/* Card grid — 1 col on mobile, 2 on sm, 3 on lg */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                    <div
                        key={row.day_of_week}
                        className={`rounded-xl border transition-all duration-150 ${
                            row.isOpen
                                ? "border-border bg-card"
                                : "border-border/40 bg-muted/20 opacity-60"
                        }`}
                    >
                        {/* ── Card header ── */}
                        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                            <span
                                className={`text-sm font-semibold ${
                                    row.isOpen ? "text-foreground" : "text-muted-foreground"
                                }`}
                            >
                                {DAY_NAMES[row.day_of_week]}
                            </span>

                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-xs font-medium ${
                                        row.isOpen ? "text-success" : "text-muted-foreground/50"
                                    }`}
                                >
                                    {row.isOpen ? "Open" : "Closed"}
                                </span>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={row.isOpen}
                                    onClick={() =>
                                        updateRow(row.day_of_week, { isOpen: !row.isOpen })
                                    }
                                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                                        row.isOpen ? "bg-cta shadow-sm" : "bg-muted-foreground/20"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                                            row.isOpen ? "translate-x-5" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* ── Time fields ── */}
                        <div className="space-y-3 px-4 py-4">
                            <div className="flex items-center gap-3">
                                <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                                    Open Time
                                </span>
                                <input
                                    type="time"
                                    className="input-base"
                                    disabled={!row.isOpen}
                                    value={row.open_time}
                                    onChange={(e) =>
                                        updateRow(row.day_of_week, { open_time: e.target.value })
                                    }
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                                    Close Time
                                </span>
                                <input
                                    type="time"
                                    className="input-base"
                                    disabled={!row.isOpen}
                                    value={row.close_time}
                                    onChange={(e) =>
                                        updateRow(row.day_of_week, { close_time: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}

export default function ClubDetailHoursSection({ clubId }: { clubId: string }): JSX.Element {
    const { data: hoursData = [], isLoading, error } = useGetOperatingHours(clubId);
    const {
        mutate: saveHours,
        isPending,
        isSuccess,
        error: saveError,
    } = useSetOperatingHours(clubId);
    const [errorDismissed, setErrorDismissed] = useState(false);

    useEffect(() => { setErrorDismissed(false); }, [error, saveError]);

    const operatingHours = hoursData as OperatingHours[];
    const initialRows = buildDefaultRows(operatingHours);
    const editorKey = JSON.stringify(operatingHours);

    return (
        <div className="space-y-4">
            {error && !errorDismissed ? <AlertToast title={(error as Error).message} variant="error" onClose={() => setErrorDismissed(true)} /> : null}
            {saveError && !errorDismissed ? <AlertToast title={(saveError as Error).message} variant="error" onClose={() => setErrorDismissed(true)} /> : null}

            {isLoading ? (
                <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                    Loading…
                </div>
            ) : (
                <HoursEditor
                    key={editorKey}
                    initialRows={initialRows}
                    isPending={isPending}
                    isSuccess={isSuccess}
                    onSave={(payload, onSuccess) => saveHours(payload, { onSuccess })}
                />
            )}
        </div>
    );
}
