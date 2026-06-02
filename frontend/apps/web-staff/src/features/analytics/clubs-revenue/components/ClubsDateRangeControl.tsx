import type { JSX } from "react";
import { DatePicker } from "@repo/ui";
import type { DateRange } from "../../types";

type Props = {
    range: DateRange;
    onChange: (next: DateRange) => void;
};

function yesterdayLocalDate(): string {
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function clampToMaxDate(value: string, maxDate: string): string {
    return value > maxDate ? maxDate : value;
}

/** From/To date pickers for the clubs-revenue range. Current and future dates are disabled. */
export function ClubsDateRangeControl({ range, onChange }: Props): JSX.Element {
    const maxSelectableDate = yesterdayLocalDate();
    const pickerCls =
        "h-9 w-[12rem] rounded-lg border-border/80 bg-card px-3 text-sm " +
        "shadow-sm shadow-black/5 hover:border-cta/45 hover:bg-background " +
        "focus:border-cta focus:ring-2 focus:ring-cta-ring/30";

    return (
        <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold leading-4 text-muted-foreground">
                    From
                </span>
                <DatePicker
                    className={pickerCls}
                    value={range.from}
                    maxDate={maxSelectableDate}
                    onChange={(value) => {
                        const from = clampToMaxDate(value, maxSelectableDate);
                        onChange({ from, to: range.to < from ? from : range.to });
                    }}
                />
            </label>
            <label className="flex flex-col gap-0.5">
                <span className="text-[11px] font-semibold leading-4 text-muted-foreground">
                    To
                </span>
                <DatePicker
                    className={pickerCls}
                    value={range.to}
                    maxDate={maxSelectableDate}
                    onChange={(value) => {
                        const to = clampToMaxDate(value, maxSelectableDate);
                        onChange({ from: to < range.from ? to : range.from, to });
                    }}
                />
            </label>
        </div>
    );
}
