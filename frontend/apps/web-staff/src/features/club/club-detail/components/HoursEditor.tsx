import type { OperatingHours } from "../../types";
import { AlertToast, TimeInput } from "@repo/ui";
import { type JSX, useEffect, useState } from "react";
import type { DayRow } from "./ClubDetailHoursSection";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface Props {
    initialRows: DayRow[];
    isPending: boolean;
    isSuccess: boolean;
    onSave: (payload: OperatingHours[], onSuccess: () => void) => void;
}

export default function HoursEditor({
    initialRows,
    isPending,
    isSuccess,
    onSave,
}: Props): JSX.Element {
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
            <div className="relative flex items-center justify-end pb-2">
                {isSuccess && !dirty && !dismissed && (
                    <div className="absolute left-0">
                        <AlertToast
                            title="Operating hours saved."
                            variant="success"
                            onClose={() => setDismissed(true)}
                        />
                    </div>
                )}
                <button onClick={handleSave} disabled={isPending || !dirty} className="btn-cta">
                    {isPending ? "Saving…" : "Save Changes"}
                </button>
            </div>

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

                        <div className="space-y-3 px-4 py-4">
                            <div className="flex items-center gap-3">
                                <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">
                                    Open Time
                                </span>
                                <TimeInput
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
                                <TimeInput
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
