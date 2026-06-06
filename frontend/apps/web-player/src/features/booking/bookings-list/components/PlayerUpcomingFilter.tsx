import type { JSX } from "react";
import { DatePicker } from "@repo/ui";
import { Search, X } from "lucide-react";

type Props = {
    search: string;
    filterDate: string;
    onSearchChange: (v: string) => void;
    onDateChange: (v: string) => void;
    onClear: () => void;
};

const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";

export default function PlayerUpcomingFilter({
    search,
    filterDate,
    onSearchChange,
    onDateChange,
    onClear,
}: Props): JSX.Element {
    const hasFilter = search.trim() !== "" || filterDate !== "";

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
                    <label className={labelCls}>Search</label>
                    <input
                        type="text"
                        className="input-base w-full"
                        placeholder="Club or court name…"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div>
                    <label className={labelCls}>Date</label>
                    <DatePicker
                        className="input-base w-full"
                        value={filterDate}
                        onChange={onDateChange}
                    />
                </div>

                <div className="flex items-end">
                    {hasFilter ? (
                        <button
                            type="button"
                            onClick={onClear}
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
