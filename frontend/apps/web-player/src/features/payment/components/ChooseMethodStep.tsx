import { type JSX, useState } from "react";
import { Check, CreditCard, Plus, Wallet } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import { useGetWallet } from "@repo/player-domain/hooks";
import type { PaymentMethod } from "../types";

interface Props {
    methods: PaymentMethod[];
    amountDue: number;
    isLoading: boolean;
    onPayWithWallet: () => void;
    onPayWithCard: (methodId: string | null) => void;
}

type MethodType = "wallet" | "card";

export function ChooseMethodStep({
    methods,
    amountDue,
    isLoading,
    onPayWithWallet,
    onPayWithCard,
}: Props): JSX.Element {
    const defaultCard = methods.find((m) => m.is_default) ?? methods[0];
    const [selectedMethod, setSelectedMethod] = useState<MethodType>("wallet");
    const [selectedCardId, setSelectedCardId] = useState<string | null>(
        defaultCard?.id ?? null
    );
    const [cardExpanded, setCardExpanded] = useState(false);

    const { data: wallet, isLoading: walletLoading } = useGetWallet();
    const walletBalance =
        typeof wallet?.balance === "string"
            ? Number.parseFloat(wallet.balance)
            : (wallet?.balance ?? 0);
    const hasEnoughBalance = walletBalance >= amountDue;

    function handleConfirm() {
        if (selectedMethod === "wallet") {
            onPayWithWallet();
        } else if (selectedCardId) {
            onPayWithCard(selectedCardId);
        } else {
            onPayWithCard(null);
        }
    }

    const selectedCard = methods.find((m) => m.id === selectedCardId);

    const confirmLabel =
        selectedMethod === "wallet"
            ? `Pay ${formatCurrency(amountDue)} with Wallet`
            : selectedCard
              ? `Pay ${formatCurrency(amountDue)} with ••${selectedCard.last4}`
              : "Continue to add card";

    const cardCount = methods.length;

    return (
        <div className="flex flex-1 flex-col px-5 pb-6 pt-5 sm:px-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                How would you like to pay?
            </p>
            <p className="mb-5 text-base font-semibold text-foreground">Choose a payment method</p>

            <div className="flex flex-col gap-3">
                {/* Wallet option */}
                <button
                    type="button"
                    onClick={() => setSelectedMethod("wallet")}
                    className={`group w-full rounded-xl border px-4 py-4 text-left transition ${
                        selectedMethod === "wallet"
                            ? "border-cta bg-cta/5 ring-2 ring-cta/20"
                            : "border-border bg-card hover:border-cta/40 hover:bg-muted/20"
                    }`}
                >
                    <div className="flex items-center gap-3">
                        <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                                selectedMethod === "wallet"
                                    ? "bg-cta text-cta-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            <Wallet size={18} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Pay with Wallet</p>
                            <p className="text-xs text-muted-foreground">
                                Instant · No extra steps required
                            </p>
                        </div>
                        <RadioDot active={selectedMethod === "wallet"} />
                    </div>

                    {/* Balance — always visible when wallet is selected */}
                    {selectedMethod === "wallet" && (
                        <div className="mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2.5">
                            <span className="text-xs text-muted-foreground">Available Balance</span>
                            {walletLoading ? (
                                <span className="h-3 w-14 animate-pulse rounded bg-muted" />
                            ) : (
                                <span
                                    className={`text-sm font-semibold ${hasEnoughBalance ? "text-cta" : "text-warning"}`}
                                >
                                    {formatCurrency(walletBalance)}
                                    {!hasEnoughBalance ? (
                                        <span className="ml-1.5 text-xs font-normal text-warning">
                                            (insufficient)
                                        </span>
                                    ) : null}
                                </span>
                            )}
                        </div>
                    )}
                </button>

                {/* Card option — collapsed summary, no inline card list */}
                <div
                    className={`w-full rounded-xl border transition ${
                        selectedMethod === "card"
                            ? "border-cta ring-2 ring-cta/20"
                            : "border-border bg-card"
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedMethod("card");
                            setCardExpanded((v) => !v);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                        <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                                selectedMethod === "card"
                                    ? "bg-cta text-cta-foreground"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            <CreditCard size={18} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Pay with Card</p>
                            <p className="text-xs text-muted-foreground">
                                Debit, Credit · Saved cards available
                            </p>
                        </div>
                        {selectedMethod === "card" && selectedCard ? (
                            <span className="mr-2 rounded-md border border-border bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                {selectedCard.brand.slice(0, 4)}
                            </span>
                        ) : cardCount > 0 ? (
                            <span className="mr-2 text-xs text-muted-foreground">
                                {cardCount} saved
                            </span>
                        ) : null}
                        <RadioDot active={selectedMethod === "card"} />
                    </button>

                    {/* Card list — only shown when card method is selected and expanded */}
                    {selectedMethod === "card" && cardExpanded && (
                        <div className="border-t border-border/60 divide-y divide-border/50">
                            {methods.map((card) => (
                                <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCardId(card.id);
                                        setCardExpanded(false);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/20"
                                >
                                    <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                        {card.brand.slice(0, 4)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            •••• {card.last4}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Exp {card.exp_month.toString().padStart(2, "0")}/
                                            {card.exp_year}
                                        </p>
                                    </div>
                                    {card.is_default ? (
                                        <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-semibold text-cta">
                                            Default
                                        </span>
                                    ) : null}
                                    <RadioDot active={selectedCardId === card.id} />
                                </button>
                            ))}

                            {/* Add new card */}
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCardId(null);
                                    setCardExpanded(false);
                                }}
                                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/20"
                            >
                                <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/50 text-muted-foreground">
                                    <Plus size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground">Add new card</p>
                                    <p className="text-xs text-muted-foreground">
                                        Securely saved for future use
                                    </p>
                                </div>
                                <RadioDot active={selectedCardId === null} />
                            </button>
                        </div>
                    )}

                    {/* Selected card summary — shown when card selected but list collapsed */}
                    {selectedMethod === "card" && !cardExpanded && (
                        <div className="border-t border-border/60 px-4 py-3">
                            {selectedCard ? (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                            {selectedCard.brand.slice(0, 4)}
                                        </div>
                                        <span className="text-sm font-medium text-foreground">
                                            •••• {selectedCard.last4}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Exp {selectedCard.exp_month.toString().padStart(2, "0")}/{selectedCard.exp_year}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCardExpanded(true)}
                                        className="text-xs font-medium text-cta hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Add a new card</span>
                                    {methods.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setCardExpanded(true)}
                                            className="text-xs font-medium text-cta hover:underline"
                                        >
                                            Use saved card
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CTA */}
            <button
                type="button"
                disabled={
                    isLoading ||
                    (selectedMethod === "wallet" && (!hasEnoughBalance || walletLoading))
                }
                onClick={handleConfirm}
                className="btn-cta mt-6 min-h-12 w-full text-sm font-semibold disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                        Preparing…
                    </>
                ) : (
                    confirmLabel
                )}
            </button>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
                3D Secure verification may apply
            </p>
        </div>
    );
}

function RadioDot({ active }: { active: boolean }): JSX.Element {
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
