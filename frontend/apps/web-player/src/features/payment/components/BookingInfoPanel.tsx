import type { JSX } from "react";
import { CalendarDays, Clock, MapPin, Tag } from "lucide-react";
import { formatCurrency, formatUTCDate, formatUTCTime } from "@repo/ui";

interface Props {
    courtName: string;
    startDatetime: string;
    endDatetime: string;
    originalPrice: number;
    discountAmount: number;
    discountSource: string | null;
    amountDue: number;
}

function InfoRow({
    icon,
    label,
    value,
}: {
    icon: JSX.Element;
    label: string;
    value: string;
}): JSX.Element {
    return (
        <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                {icon}
                {label}
            </span>
            <span className="text-sm font-medium text-foreground text-right">{value}</span>
        </div>
    );
}

export function BookingInfoPanel({
    courtName,
    startDatetime,
    endDatetime,
    originalPrice,
    discountAmount,
    discountSource,
    amountDue,
}: Props): JSX.Element {
    const hasDiscount = discountAmount > 0;

    return (
        <div className="flex flex-col gap-5">
            {/* Court header */}
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta ring-1 ring-cta/15">
                    <MapPin size={18} />
                </span>
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Court
                    </p>
                    <p className="mt-0.5 truncate text-lg font-bold text-foreground">{courtName}</p>
                </div>
            </div>

            {/* Date/time details */}
            <div className="rounded-xl border border-border/60 bg-muted/10 px-4">
                <InfoRow
                    icon={<CalendarDays size={14} />}
                    label="Date"
                    value={formatUTCDate(startDatetime)}
                />
                <InfoRow
                    icon={<Clock size={14} />}
                    label="Start"
                    value={formatUTCTime(startDatetime)}
                />
                <InfoRow
                    icon={<Clock size={14} />}
                    label="End"
                    value={formatUTCTime(endDatetime)}
                />
            </div>

            {/* Pricing breakdown */}
            <div className="rounded-xl border border-border/60 bg-muted/10 overflow-hidden">
                <div className="px-4">
                    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50">
                        <span className="text-sm text-muted-foreground">Your share</span>
                        <span
                            className={`text-sm font-medium ${hasDiscount ? "text-muted-foreground line-through" : "text-foreground"}`}
                        >
                            {formatCurrency(originalPrice)}
                        </span>
                    </div>

                    {hasDiscount ? (
                        <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Tag size={14} />
                                {discountSource ?? "Discount"}
                            </span>
                            <span className="text-sm font-semibold text-cta">
                                -{formatCurrency(discountAmount)}
                            </span>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 bg-cta/8 border-t border-cta/15 px-4 py-3.5">
                    <span className="text-sm font-semibold text-foreground">Total due</span>
                    <span className="text-2xl font-bold tracking-tight text-cta">
                        {formatCurrency(amountDue)}
                    </span>
                </div>
            </div>

            {/* Security note */}
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                Secured with 256-bit SSL encryption
            </p>
        </div>
    );
}
