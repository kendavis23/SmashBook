import { type JSX, useCallback } from "react";
import { CreditCard, Star, Trash2 } from "lucide-react";
import {
    useListPaymentMethods,
    useDeletePaymentMethod,
    useSetDefaultPaymentMethod,
} from "@repo/player-domain/hooks";
import type { PaymentMethod } from "../types";

function CardBrandIcon({ brand }: { brand: string }): JSX.Element {
    return (
        <div className="flex h-8 w-12 items-center justify-center rounded border border-border bg-muted text-[10px] font-bold uppercase text-muted-foreground">
            {brand}
        </div>
    );
}

function CardRow({
    card,
    onDelete,
    onSetDefault,
    isDeleting,
    isSettingDefault,
}: {
    card: PaymentMethod;
    onDelete: (id: string) => void;
    onSetDefault: (id: string) => void;
    isDeleting: boolean;
    isSettingDefault: boolean;
}): JSX.Element {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <CardBrandIcon brand={card.brand} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">•••• {card.last4}</p>
                <p className="text-xs text-muted-foreground">
                    Expires {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>
            {card.is_default ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">
                    <Star size={10} />
                    Default
                </span>
            ) : (
                <button
                    type="button"
                    disabled={isSettingDefault}
                    onClick={() => onSetDefault(card.id)}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
                >
                    Set default
                </button>
            )}
            <button
                type="button"
                disabled={isDeleting}
                onClick={() => onDelete(card.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                aria-label="Remove card"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
}

export function SavedCardList(): JSX.Element {
    const { data: methods, isLoading, error } = useListPaymentMethods();
    const deleteMutation = useDeletePaymentMethod();
    const setDefaultMutation = useSetDefaultPaymentMethod();

    const handleDelete = useCallback(
        (id: string) => {
            deleteMutation.mutate(id);
        },
        [deleteMutation]
    );

    const handleSetDefault = useCallback(
        (id: string) => {
            setDefaultMutation.mutate(id);
        },
        [setDefaultMutation]
    );

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 py-8">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                <span className="text-sm text-muted-foreground">Loading cards…</span>
            </div>
        );
    }

    if (error) {
        return <p className="text-sm text-destructive">Failed to load payment methods.</p>;
    }

    if (!methods || methods.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CreditCard size={24} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No saved cards.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {methods.map((card) => (
                <CardRow
                    key={card.id}
                    card={card}
                    onDelete={handleDelete}
                    onSetDefault={handleSetDefault}
                    isDeleting={deleteMutation.isPending && deleteMutation.variables === card.id}
                    isSettingDefault={
                        setDefaultMutation.isPending && setDefaultMutation.variables === card.id
                    }
                />
            ))}
        </div>
    );
}
