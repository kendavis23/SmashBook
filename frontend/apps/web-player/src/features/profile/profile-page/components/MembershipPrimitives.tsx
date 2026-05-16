import { type JSX } from "react";
import { ArrowLeft, Check } from "lucide-react";
import type { PaymentMethod } from "@repo/player-domain/models";

export function StatRow({
    label,
    value,
}: {
    label: string;
    value: string | number | null;
}): JSX.Element {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-muted/35">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-right font-semibold text-foreground">{value ?? "—"}</span>
        </div>
    );
}

export function SectionHeader({
    icon,
    title,
}: {
    icon: JSX.Element;
    title: string;
}): JSX.Element {
    return (
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {icon}
            </span>
            <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
    );
}

export function RadioDot({ active }: { active: boolean }): JSX.Element {
    return (
        <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                active ? "border-cta bg-cta text-cta-foreground" : "border-muted-foreground/40"
            }`}
        >
            {active ? <Check size={11} /> : null}
        </div>
    );
}

export function BackButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
            <ArrowLeft size={14} />
            {label}
        </button>
    );
}

export function CardRow({
    card,
    selected,
    onSelect,
}: {
    card: PaymentMethod;
    selected: boolean;
    onSelect: () => void;
}): JSX.Element {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                selected
                    ? "border-cta bg-card"
                    : "border-transparent hover:border-border hover:bg-muted/30"
            }`}
        >
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {card.brand.slice(0, 4)}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">•••• {card.last4}</p>
                <p className="text-xs text-muted-foreground">
                    Exp {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>
            {card.is_default && (
                <span className="hidden rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta sm:inline-flex">
                    Default
                </span>
            )}
            <RadioDot active={selected} />
        </button>
    );
}
