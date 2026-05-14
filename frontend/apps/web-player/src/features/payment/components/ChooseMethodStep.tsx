import { type JSX, useState } from "react";
import { CreditCard, Plus, Star, Check, Wallet } from "lucide-react";
import { formatCurrency } from "@repo/ui";
import { useGetWallet } from "@repo/player-domain/hooks";
import type { PaymentMethod } from "../types";

type Tab = "wallet" | "card";

interface Props {
    methods: PaymentMethod[];
    amountDue: number;
    isLoading: boolean;
    onPayWithWallet: () => void;
    onPayWithCard: (methodId: string | null) => void;
}

function CardRow({
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
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                selected
                    ? "border-cta bg-cta/5 ring-1 ring-cta/30"
                    : "border-border bg-card hover:border-cta/40 hover:bg-muted/20"
            }`}
        >
            <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <span className="max-w-full truncate">{card.brand}</span>
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">•••• {card.last4}</p>
                <p className="text-xs text-muted-foreground">
                    Expires {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>
            {card.is_default ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-cta/10 px-2.5 py-0.5 text-[11px] font-semibold text-cta">
                    <Star size={10} />
                    Default
                </span>
            ) : null}
            <div
                className={`ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    selected ? "border-cta bg-cta text-cta-foreground" : "border-muted-foreground/50"
                }`}
            >
                {selected ? <Check size={12} /> : null}
            </div>
        </button>
    );
}

export function ChooseMethodStep({
    methods,
    amountDue,
    isLoading,
    onPayWithWallet,
    onPayWithCard,
}: Props): JSX.Element {
    const [tab, setTab] = useState<Tab>("card");
    const [selectedCardId, setSelectedCardId] = useState<string | null>(
        methods.find((m) => m.is_default)?.id ?? methods[0]?.id ?? null
    );
    const [useNewCard, setUseNewCard] = useState(false);

    const { data: wallet, isLoading: walletLoading } = useGetWallet({
        enabled: tab === "wallet",
    });

    const walletBalance =
        typeof wallet?.balance === "string"
            ? Number.parseFloat(wallet.balance)
            : (wallet?.balance ?? 0);
    const hasEnoughBalance = walletBalance >= amountDue;

    function handleSelectCard(id: string) {
        setSelectedCardId(id);
        setUseNewCard(false);
    }

    function handleCardProceed() {
        onPayWithCard(useNewCard ? null : selectedCardId);
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {/* Amount banner */}
            <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Amount due</p>
                    <p className="text-2xl font-bold tracking-tight text-foreground">
                        {formatCurrency(amountDue)}
                    </p>
                </div>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 border-b border-border/60 bg-card px-6 pt-4">
                <button
                    type="button"
                    onClick={() => setTab("card")}
                    className={`flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm font-medium transition ${
                        tab === "card"
                            ? "border-b-2 border-cta text-cta"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <CreditCard size={14} />
                    Card
                </button>
                <button
                    type="button"
                    onClick={() => setTab("wallet")}
                    className={`flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm font-medium transition ${
                        tab === "wallet"
                            ? "border-b-2 border-cta text-cta"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Wallet size={14} />
                    Wallet
                </button>
            </div>

            {/* Tab content */}
            <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
                {tab === "card" ? (
                    <div className="flex flex-1 flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            {methods.map((card) => (
                                <CardRow
                                    key={card.id}
                                    card={card}
                                    selected={!useNewCard && selectedCardId === card.id}
                                    onSelect={() => handleSelectCard(card.id)}
                                />
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCardId(null);
                                    setUseNewCard(true);
                                }}
                                className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                                    useNewCard
                                        ? "border-cta bg-cta/5 ring-1 ring-cta/30"
                                        : "border-border bg-card hover:border-cta/40 hover:bg-muted/20"
                                }`}
                            >
                                <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                                    <Plus size={16} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        New card
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Enter details at next step
                                    </p>
                                </div>
                                <div
                                    className={`ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                        useNewCard
                                            ? "border-cta bg-cta text-cta-foreground"
                                            : "border-muted-foreground/50"
                                    }`}
                                >
                                    {useNewCard ? <Check size={12} /> : null}
                                </div>
                            </button>
                        </div>

                        <button
                            type="button"
                            disabled={isLoading || (!useNewCard && !selectedCardId)}
                            onClick={handleCardProceed}
                            className="btn-cta mt-auto min-h-11 w-full"
                        >
                            {isLoading ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                                    Preparing…
                                </>
                            ) : (
                                <>
                                    <CreditCard size={15} />
                                    {useNewCard
                                        ? `Continue`
                                        : `Pay ${formatCurrency(amountDue)}`}
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col gap-4">
                        {walletLoading ? (
                            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                                Loading wallet…
                            </div>
                        ) : (
                            <>
                                <div className="rounded-xl border border-border bg-card p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cta/10 text-cta">
                                                <Wallet size={18} />
                                            </span>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    Wallet balance
                                                </p>
                                                <p
                                                    className={`text-xs font-medium ${hasEnoughBalance ? "text-success" : "text-warning"}`}
                                                >
                                                    {hasEnoughBalance
                                                        ? "Sufficient for this booking"
                                                        : "Insufficient balance"}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xl font-bold tracking-tight text-foreground">
                                            {formatCurrency(walletBalance)}
                                        </p>
                                    </div>

                                    {!hasEnoughBalance ? (
                                        <div className="mt-4 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-warning">
                                            You need {formatCurrency(amountDue - walletBalance)}{" "}
                                            more. Top up your wallet to use this method.
                                        </div>
                                    ) : (
                                        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                                            <p className="text-xs text-muted-foreground">
                                                After payment
                                            </p>
                                            <p className="text-sm font-semibold text-foreground">
                                                {formatCurrency(walletBalance - amountDue)}{" "}
                                                remaining
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    disabled={!hasEnoughBalance || isLoading}
                                    onClick={onPayWithWallet}
                                    className="btn-cta mt-auto min-h-11 w-full disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                                            Processing…
                                        </>
                                    ) : (
                                        <>
                                            <Wallet size={15} />
                                            Pay {formatCurrency(amountDue)} with Wallet
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
