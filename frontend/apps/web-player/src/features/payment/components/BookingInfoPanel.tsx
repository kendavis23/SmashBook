import type { JSX } from "react";
import { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, ShieldCheck, Tag, Timer } from "lucide-react";
import { formatCurrency, formatUTCDate, formatUTCTime } from "@repo/ui";

function PaymentCountdownBanner({ deadline }: { deadline: Date }): JSX.Element | null {
    const [secsLeft, setSecsLeft] = useState(() =>
        Math.max(0, Math.round((deadline.getTime() - Date.now()) / 1000))
    );

    useEffect(() => {
        if (secsLeft <= 0) return;
        const id = setInterval(() => {
            setSecsLeft(Math.max(0, Math.round((deadline.getTime() - Date.now()) / 1000)));
        }, 1000);
        return () => clearInterval(id);
    }, [deadline, secsLeft]);

    if (secsLeft <= 0) return null;

    const mins = Math.floor(secsLeft / 60);
    const secs = secsLeft % 60;
    const isUrgent = secsLeft <= 60;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border px-4 py-4 transition-colors ${
                isUrgent ? "border-destructive/25 bg-destructive/5" : "border-cta/20 bg-cta/5"
            }`}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <Timer size={12} className={isUrgent ? "text-destructive" : "text-cta"} />
                    Time left to pay
                </span>
                <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isUrgent ? "bg-destructive/15 text-destructive" : "bg-cta/15 text-cta"
                    }`}
                >
                    {isUrgent ? "Expiring" : "Reserving"}
                </span>
            </div>

            <div className="flex items-baseline gap-1 tabular-nums">
                <span
                    className={`text-5xl font-black tracking-tighter leading-none ${
                        isUrgent ? "text-destructive" : "text-cta"
                    }`}
                >
                    {String(mins).padStart(2, "0")}
                </span>
                <span
                    className={`text-4xl font-black leading-none pb-0.5 ${
                        isUrgent ? "text-destructive/60" : "text-cta/60"
                    }`}
                >
                    :
                </span>
                <span
                    className={`text-5xl font-black tracking-tighter leading-none ${
                        isUrgent ? "text-destructive" : "text-cta"
                    }`}
                >
                    {String(secs).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground ml-1 pb-1">min</span>
            </div>

            <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                We&apos;ll release your slot when time runs out.
            </p>
        </div>
    );
}

interface Props {
    courtName: string;
    startDatetime: string;
    endDatetime: string;
    originalPrice: number;
    discountAmount: number;
    discountSource: string | null;
    amountDue: number;
    paymentDeadline?: Date;
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
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/40 last:border-0">
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="text-muted-foreground/70">{icon}</span>
                {label}
            </span>
            <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
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
    paymentDeadline,
}: Props): JSX.Element {
    const hasDiscount = discountAmount > 0;

    return (
        <div className="flex flex-col gap-4">
            {/* Countdown banner — shown first for urgency */}
            {paymentDeadline ? <PaymentCountdownBanner deadline={paymentDeadline} /> : null}

            {/* Court header */}
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cta/10 text-cta ring-1 ring-cta/20">
                    <MapPin size={17} />
                </span>
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Court
                    </p>
                    <p className="mt-0.5 truncate text-base font-bold text-foreground leading-tight">
                        {courtName}
                    </p>
                </div>
            </div>

            {/* Date/time details */}
            <div className="rounded-2xl border border-border/50 bg-muted/10 px-4">
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
            <div className="rounded-2xl border border-border/50 overflow-hidden">
                <div className="bg-muted/10 px-4">
                    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/40">
                        <span className="text-sm text-muted-foreground">Your share</span>
                        <span
                            className={`text-sm font-semibold tabular-nums ${
                                hasDiscount
                                    ? "text-muted-foreground/60 line-through"
                                    : "text-foreground"
                            }`}
                        >
                            {formatCurrency(originalPrice)}
                        </span>
                    </div>

                    {hasDiscount ? (
                        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/40">
                            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Tag size={13} />
                                <span className="capitalize">{discountSource ?? "Discount"}</span>
                            </span>
                            <span className="text-sm font-bold text-cta tabular-nums">
                                -{formatCurrency(discountAmount)}
                            </span>
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 bg-cta/8 border-t border-cta/15 px-4 py-4">
                    <span className="text-sm font-semibold text-foreground">Total due</span>
                    <span className="text-3xl font-black tracking-tight text-cta tabular-nums leading-none">
                        {formatCurrency(amountDue)}
                    </span>
                </div>
            </div>

            {/* Security note */}
            <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} className="text-success shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                    Secured with 256-bit SSL encryption
                </p>
            </div>
        </div>
    );
}
