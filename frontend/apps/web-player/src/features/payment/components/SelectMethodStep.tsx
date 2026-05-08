import { type JSX, useState } from "react";
import { CreditCard, Star, Plus } from "lucide-react";
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
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                selected
                    ? "border-cta bg-cta/5 ring-1 ring-cta"
                    : "border-border bg-card hover:border-cta/40"
            }`}
        >
            <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded border border-border bg-muted text-[10px] font-bold uppercase text-muted-foreground">
                {card.brand}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                    •••• {card.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                    Expires {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>
            {card.is_default && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">
                    <Star size={10} />
                    Default
                </span>
            )}
            <div
                className={`ml-1 h-4 w-4 shrink-0 rounded-full border-2 transition ${
                    selected ? "border-cta bg-cta" : "border-muted-foreground"
                }`}
            />
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
        <div className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-2">
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
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                        useNew
                            ? "border-cta bg-cta/5 ring-1 ring-cta"
                            : "border-border bg-card hover:border-cta/40"
                    }`}
                >
                    <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
                        <Plus size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Use a new card</p>
                        <p className="text-xs text-muted-foreground">Enter card details at checkout</p>
                    </div>
                    <div
                        className={`ml-1 h-4 w-4 shrink-0 rounded-full border-2 transition ${
                            useNew ? "border-cta bg-cta" : "border-muted-foreground"
                        }`}
                    />
                </button>
            </div>

            <button
                type="button"
                disabled={isLoading || (!useNew && !selected)}
                onClick={handleConfirm}
                className="btn-primary flex items-center justify-center gap-2"
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
