import type { FormEvent, JSX } from "react";
import { X, Clock } from "lucide-react";
import { AlertToast, TimeInput, DatePicker, SelectInput } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import type { AvailabilityFormState } from "../../types";
import { DAY_OPTIONS } from "../../types";

type Props = {
    form: AvailabilityFormState;
    apiError: string;
    isPending: boolean;
    onFormChange: (patch: Partial<AvailabilityFormState>) => void;
    onSubmit: (e: FormEvent) => void;
    onClose: () => void;
    onDismissError: () => void;
};

const dayOptions: SelectOption[] = DAY_OPTIONS;

export default function CreateAvailabilityModalView({
    form,
    apiError,
    isPending,
    onFormChange,
    onSubmit,
    onClose,
    onDismissError,
}: Props): JSX.Element {
    return (
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
            {/* Sticky header */}
            <div className="shrink-0 border-b border-border px-6 pb-5 pt-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                            <Clock size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Create Availability
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Add a recurring time slot for this trainer.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {apiError ? (
                    <div className="mb-4">
                        <AlertToast title={apiError} variant="error" onClose={onDismissError} />
                    </div>
                ) : null}

                <div className="space-y-5">
                    {/* Day of week */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Day of Week
                        </label>
                        <SelectInput
                            name="day_of_week"
                            value={form.day_of_week}
                            options={dayOptions}
                            onValueChange={(v) => onFormChange({ day_of_week: v })}
                            placeholder="Select day"
                        />
                    </div>

                    {/* Start / End time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-foreground">
                                Start Time
                            </label>
                            <TimeInput
                                className="input-base"
                                value={form.start_time}
                                onChange={(e) => onFormChange({ start_time: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-foreground">
                                End Time
                            </label>
                            <TimeInput
                                className="input-base"
                                value={form.end_time}
                                onChange={(e) => onFormChange({ end_time: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    {/* Effective from / until */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-foreground">
                                Effective From
                            </label>
                            <DatePicker
                                className="input-base"
                                value={form.effective_from}
                                onChange={(v) => onFormChange({ effective_from: v })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-foreground">
                                Effective Until{" "}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </label>
                            <DatePicker
                                className="input-base"
                                value={form.effective_until}
                                onChange={(v) => onFormChange({ effective_until: v })}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Notes{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <input
                            type="text"
                            className="input-base w-full"
                            value={form.notes}
                            placeholder="e.g. Morning session only"
                            onChange={(e) => onFormChange({ notes: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-border px-6 py-4">
                <button type="button" onClick={onClose} className="btn-outline">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-cta flex items-center gap-2"
                >
                    <Clock size={14} />
                    {isPending ? "Creating…" : "Create Availability"}
                </button>
            </div>
        </form>
    );
}
