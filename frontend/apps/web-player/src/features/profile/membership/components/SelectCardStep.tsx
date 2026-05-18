import { useState, useEffect, type JSX } from "react";
import { formatCurrency } from "@repo/ui";
import { useListPaymentMethods } from "@repo/player-domain/hooks";
import { CreditCard } from "lucide-react";
import type { MembershipPlan } from "@repo/player-domain/models";
import { BackButton, SectionHeader, CardRow } from "./MembershipPrimitives";

type Props = {
    plan: MembershipPlan;
    onBack: () => void;
    onConfirm: (paymentMethodId: string) => void;
    isLoading: boolean;
    error: string | null;
};

export function SelectCardStep({ plan, onBack, onConfirm, isLoading, error }: Props): JSX.Element {
    const { data: methods = [], isLoading: methodsLoading } = useListPaymentMethods();
    const defaultCard = methods.find((m) => m.is_default) ?? methods[0];
    const [selectedCardId, setSelectedCardId] = useState<string | null>(defaultCard?.id ?? null);
    const selectedCard = methods.find((m) => m.id === selectedCardId) ?? null;
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";

    useEffect(() => {
        if (!selectedCardId && defaultCard) {
            setSelectedCardId(defaultCard.id);
        }
    }, [defaultCard, selectedCardId]);

    return (
        <div className="space-y-4">
            <BackButton label="Back to plans" onClick={onBack} />

            <section className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                            Confirm subscription
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {plan.name}
                            {plan.description ? ` · ${plan.description}` : ""}
                        </p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                        <p className="text-lg font-bold tracking-tight text-foreground">
                            {formatCurrency(plan.price)}
                            <span className="text-sm font-medium text-muted-foreground">
                                {" "}
                                / {billingPeriod}
                            </span>
                        </p>
                    </div>
                </div>
                {plan.trial_days > 0 && (
                    <div className="mt-3 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                        Includes {plan.trial_days}-day free trial. You will not be charged until it
                        ends.
                    </div>
                )}
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-card">
                <SectionHeader icon={<CreditCard size={15} />} title="Payment card" />
                {methodsLoading ? (
                    <div className="flex items-center gap-3 px-4 py-5">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                        <span className="text-sm text-muted-foreground">Loading cards…</span>
                    </div>
                ) : methods.length === 0 ? (
                    <div className="px-4 py-5 text-sm text-muted-foreground">
                        No saved cards. Add a card in the{" "}
                        <span className="font-medium text-foreground">Billing</span> tab first.
                    </div>
                ) : (
                    <div className="divide-y divide-border/50 p-2">
                        {methods.map((card) => (
                            <CardRow
                                key={card.id}
                                card={card}
                                selected={selectedCardId === card.id}
                                onSelect={() => setSelectedCardId(card.id)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {error && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={() => selectedCardId && onConfirm(selectedCardId)}
                disabled={!selectedCard || isLoading || methodsLoading}
                className="btn-cta w-full min-h-12 text-sm font-semibold disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                        Confirming…
                    </>
                ) : selectedCard ? (
                    <>
                        <CreditCard size={15} />
                        Confirm with ••{selectedCard.last4}
                    </>
                ) : (
                    "Select a card to continue"
                )}
            </button>

            <p className="text-center text-[11px] text-muted-foreground">
                Secured by Stripe · 3D Secure may apply
            </p>
        </div>
    );
}
