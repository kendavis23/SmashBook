import type { JSX } from "react";
import { DatePicker } from "@repo/ui";
import { CalendarRange } from "lucide-react";
import type { DateRange } from "../../types";

type Props = {
    range: DateRange;
    onChange: (next: DateRange) => void;
};

/** From/To date pickers for the utilisation range. "to" is clamped to be ≥ "from". */
export function DateRangeControl({ range, onChange }: Props): JSX.Element {
    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="hidden items-center gap-2 self-center text-muted-foreground sm:flex">
                <CalendarRange size={16} />
            </div>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">From</span>
                <DatePicker
                    className="input-base"
                    value={range.from}
                    onChange={(from) => onChange({ from, to: range.to < from ? from : range.to })}
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">To</span>
                <DatePicker
                    className="input-base"
                    value={range.to}
                    onChange={(to) => onChange({ from: to < range.from ? to : range.from, to })}
                />
            </label>
        </div>
    );
}
