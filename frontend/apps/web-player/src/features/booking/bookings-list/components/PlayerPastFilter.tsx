import type { JSX } from "react";
import { DatePicker } from "@repo/ui";
import { Search, X } from "lucide-react";

type Props = {
    pastFrom: string;
    pastTo: string;
    onPastFilterChange: (patch: { pastFrom?: string; pastTo?: string }) => void;
    onPastFilterApply: () => void;
    onPastFilterClear: () => void;
};

const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";

export default function PlayerPastFilter({
    pastFrom,
    pastTo,
    onPastFilterChange,
    onPastFilterApply,
    onPastFilterClear,
}: Props): JSX.Element {
    return (
        <div className="border-b border-border bg-muted/10 px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center gap-2">
                <Search size={13} className="text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Filters
                </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                    <label className={labelCls}>From</label>
                    <DatePicker
                        className="input-base w-full"
                        value={pastFrom}
                        onChange={(v) => onPastFilterChange({ pastFrom: v })}
                    />
                </div>

                <div>
                    <label className={labelCls}>To</label>
                    <DatePicker
                        className="input-base w-full"
                        value={pastTo}
                        onChange={(v) => onPastFilterChange({ pastTo: v })}
                    />
                </div>

                <div className="flex items-end gap-2">
                    <button
                        type="button"
                        onClick={onPastFilterApply}
                        disabled={!pastFrom && !pastTo}
                        className="btn-cta h-[38px] px-4"
                        aria-label="Apply filters"
                    >
                        <Search size={14} />
                        Apply
                    </button>
                    {pastFrom || pastTo ? (
                        <button
                            type="button"
                            onClick={onPastFilterClear}
                            className="btn-outline h-[38px] px-3"
                            aria-label="Clear filters"
                        >
                            <X size={14} />
                            Clear
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
