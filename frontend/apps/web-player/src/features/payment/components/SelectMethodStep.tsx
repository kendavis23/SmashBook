import { type JSX, useState } from "react";
import { CreditCard, Star, Plus, Check } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import type { PaymentMethod } from "../types";

interface Props {
    methods: PaymentMethod[];
    amount: number;
    isLoading: boolean;
    onConfirm: (methodId: string | null) => void;
}

function CardOption({
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
            className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left shadow-sm transition ${
                selected
                    ? "border-cta bg-cta/5 ring-2 ring-cta/25"
                    : "border-border bg-card hover:border-cta/40 hover:bg-muted/20"
            }`}
        >
            <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-muted px-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <span className="max-w-full truncate">{card.brand}</span>
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-foreground">•••• {card.last4}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Expires {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>
            {card.is_default && (
                <span className="hidden shrink-0 items-center gap-1 rounded-full bg-cta/10 px-3 py-1 text-xs font-semibold text-cta sm:inline-flex">
                    <Star size={12} />
                    Default
                </span>
            )}
            <div
                className={`ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    selected
                        ? "border-cta bg-cta text-cta-foreground"
                        : "border-muted-foreground/70"
                }`}
            >
                {selected ? <Check size={14} /> : null}
            </div>
        </button>
    );
}

export function SelectMethodStep({ methods, amount, isLoading, onConfirm }: Props): JSX.Element {
    const defaultId = methods.find((m) => m.is_default)?.id ?? methods[0]?.id ?? null;
    const [selected, setSelected] = useState<string | null>(defaultId);
    const [useNew, setUseNew] = useState(false);

    function handleSelectCard(id: string) {
        setSelected(id);
        setUseNew(false);
    }

    function handleSelectNew() {
        setSelected(null);
        setUseNew(true);
    }

    function handleConfirm() {
        onConfirm(useNew ? null : selected);
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-5">
            <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/25 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-foreground">Amount due</p>
                    <p className="text-xs text-muted-foreground">
                        Select a saved card or add a new one
                    </p>
                </div>
                <p className="text-lg font-semibold text-foreground">{formatCurrency(amount)}</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {methods.map((card) => (
                    <CardOption
                        key={card.id}
                        card={card}
                        selected={!useNew && selected === card.id}
                        onSelect={() => handleSelectCard(card.id)}
                    />
                ))}

                <button
                    type="button"
                    onClick={handleSelectNew}
                    className={`flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left shadow-sm transition ${
                        useNew
                            ? "border-cta bg-cta/5 ring-2 ring-cta/25"
                            : "border-border bg-card hover:border-cta/40 hover:bg-muted/20"
                    }`}
                >
                    <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                        <Plus size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground">Use a new card</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Enter card details at checkout
                        </p>
                    </div>
                    <div
                        className={`ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                            useNew
                                ? "border-cta bg-cta text-cta-foreground"
                                : "border-muted-foreground/70"
                        }`}
                    >
                        {useNew ? <Check size={14} /> : null}
                    </div>
                </button>
            </div>

            <button
                type="button"
                disabled={isLoading || (!useNew && !selected)}
                onClick={handleConfirm}
                className="btn-cta mt-5 min-h-11 w-full"
            >
                {isLoading ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                        Preparing…
                    </>
                ) : (
                    <>
                        <CreditCard size={15} />
                        {useNew ? `Pay ${formatCurrency(amount)}` : "Proceed"}
                    </>
                )}
            </button>
        </div>
    );
}
