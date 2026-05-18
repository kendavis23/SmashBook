import { type JSX, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import { useGetWallet, useTopUpWallet, useListPaymentMethods } from "@repo/player-domain/hooks";
import type { PaymentMethod } from "@repo/player-domain/models";
import { AlertToast, SelectInput, formatCurrency, formatUTCDateTime } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import {
    ArrowDownLeft,
    ArrowDownToLine,
    ArrowUpRight,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    RefreshCw,
    Wallet,
} from "lucide-react";

const PAGE_SIZE = 8;

const stripePromise = loadStripe(config.stripePublishableKey);

function TopUpPanel({
    methods,
    onSuccess,
    onCancel,
}: {
    methods: PaymentMethod[];
    onSuccess: () => void;
    onCancel: () => void;
}): JSX.Element {
    const topUp = useTopUpWallet();
    const [amountInput, setAmountInput] = useState<string>("");
    const [selectedMethodId, setSelectedMethodId] = useState<string>(
        methods.find((m) => m.is_default)?.id ?? methods[0]?.id ?? ""
    );
    const [error, setError] = useState<string | null>(null);

    const amountPence = Math.round(parseFloat(amountInput || "0") * 100);
    const amountValid = amountPence >= 100;

    const cardOptions: SelectOption[] = methods.map((m) => ({
        value: m.id,
        label: `•••• ${m.last4}${m.brand ? ` (${m.brand})` : ""}`,
    }));

    const handleTopUp = useCallback(async () => {
        setError(null);
        try {
            const result = await topUp.mutateAsync({
                amount_pence: amountPence,
                payment_method_id: selectedMethodId || null,
            });

            const stripe = await stripePromise;
            if (!stripe) throw new Error("Stripe not available.");

            const { error: stripeError } = await stripe.confirmCardPayment(result.client_secret, {
                payment_method: selectedMethodId || undefined,
            });

            if (stripeError) {
                setError(stripeError.message ?? "Payment failed.");
                return;
            }

            onSuccess();
        } catch (err) {
            setError((err as { message?: string })?.message ?? "Top-up failed.");
        }
    }, [amountPence, selectedMethodId, topUp, onSuccess]);

    return (
        <div className="mt-5 rounded-xl border border-border/70 bg-background/75 p-3 shadow-sm backdrop-blur sm:p-4">
            {error && (
                <div className="mb-3">
                    <AlertToast title={error} variant="error" onClose={() => setError(null)} />
                </div>
            )}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="grid flex-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                    <label className="block">
                        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Amount
                        </span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                                £
                            </span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="0.00"
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                className="h-11 w-full rounded-lg border border-border/80 bg-card pl-8 pr-3 text-sm font-semibold text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground/50 focus:border-cta/60 focus:ring-2 focus:ring-cta/15"
                            />
                        </div>
                    </label>

                    <label className="block min-w-0">
                        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Pay with
                        </span>
                        {methods.length === 0 ? (
                            <div className="flex h-11 items-center rounded-lg border border-dashed border-border bg-card px-3 text-sm text-muted-foreground">
                                No saved cards.
                            </div>
                        ) : (
                            <SelectInput
                                name="card"
                                value={selectedMethodId}
                                options={cardOptions}
                                onValueChange={(v) => setSelectedMethodId(v)}
                                placeholder="Select card"
                                className="input-base h-11 bg-card text-sm font-medium"
                            />
                        )}
                    </label>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={topUp.isPending}
                        className="btn-outline h-11 px-4 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={
                            topUp.isPending ||
                            !selectedMethodId ||
                            methods.length === 0 ||
                            !amountValid
                        }
                        onClick={() => void handleTopUp()}
                        className="btn-cta h-11 px-5 text-sm shadow-md shadow-cta/15"
                    >
                        {topUp.isPending ? (
                            <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                                Processing…
                            </>
                        ) : (
                            <>
                                <ArrowDownToLine size={11} />
                                Top up
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function PaymentWalletView(): JSX.Element {
    const { data: wallet, isLoading, error, refetch } = useGetWallet();
    const { data: methods = [] } = useListPaymentMethods();
    const [showTopUp, setShowTopUp] = useState(false);
    const [successToast, setSuccessToast] = useState<string | null>(null);
    const [txPage, setTxPage] = useState(0);

    const handleRefresh = useCallback(() => {
        void refetch();
    }, [refetch]);

    const handleTopUpSuccess = useCallback(() => {
        setShowTopUp(false);
        setSuccessToast("Wallet topped up successfully.");
        setTxPage(0);
        void refetch();
    }, [refetch]);

    return (
        <div className="space-y-5">
            {successToast && (
                <AlertToast
                    title={successToast}
                    variant="success"
                    onClose={() => setSuccessToast(null)}
                />
            )}

            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-lg  sm:p-6">
                <div className="relative flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                        {isLoading ? (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Wallet balance
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-cta" />
                                    <span className="text-sm text-muted-foreground">Loading…</span>
                                </div>
                            </div>
                        ) : error ? (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                    Wallet balance
                                </p>
                                <p className="mt-3 text-sm font-medium text-destructive">
                                    Failed to load wallet.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/80 text-cta shadow-sm ring-1 ring-border/60">
                                        <Wallet size={17} />
                                    </span>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        Wallet balance
                                    </p>
                                </div>
                                <p className="mt-4 text-4xl font-bold leading-none tracking-tight text-foreground sm:text-5xl">
                                    {formatCurrency(wallet?.balance ?? 0)}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Available for bookings and instant checkout.
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleRefresh}
                                disabled={isLoading}
                                aria-label="Refresh wallet"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition hover:border-cta/30 hover:bg-background hover:text-foreground disabled:opacity-50"
                            >
                                <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                            </button>
                            {!showTopUp && (
                                <button
                                    type="button"
                                    onClick={() => setShowTopUp(true)}
                                    className="btn-cta h-10 px-4 text-sm shadow-md shadow-cta/15"
                                >
                                    <ArrowDownToLine size={15} />
                                    Top up
                                </button>
                            )}
                        </div>
                    </div>

                    {showTopUp && (
                        <TopUpPanel
                            methods={methods}
                            onSuccess={handleTopUpSuccess}
                            onCancel={() => setShowTopUp(false)}
                        />
                    )}
                </div>
            </div>

            {/* Transaction history */}
            {!isLoading &&
                !error &&
                wallet &&
                wallet.transactions.length > 0 &&
                (() => {
                    const totalPages = Math.ceil(wallet.transactions.length / PAGE_SIZE);
                    const pageTxs = wallet.transactions.slice(
                        txPage * PAGE_SIZE,
                        (txPage + 1) * PAGE_SIZE
                    );
                    return (
                        <div className="rounded-2xl border border-border/70 bg-card shadow-sm">
                            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-5">
                                <div>
                                    <h4 className="text-sm font-semibold tracking-tight text-foreground">
                                        Recent transactions
                                    </h4>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Latest wallet activity
                                    </p>
                                </div>
                                {totalPages > 1 && (
                                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                        {txPage + 1} / {totalPages}
                                    </span>
                                )}
                            </div>
                            <div className="divide-y divide-border/70">
                                {pageTxs.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="group flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-accent/35 sm:px-5"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                                    tx.transaction_type === "debit"
                                                        ? "bg-destructive/10 text-destructive"
                                                        : "bg-success/10 text-success"
                                                }`}
                                            >
                                                {tx.transaction_type === "debit" ? (
                                                    <ArrowUpRight size={16} />
                                                ) : (
                                                    <ArrowDownLeft size={16} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold capitalize text-foreground">
                                                    {tx.transaction_type.replace(/_/g, " ")}
                                                </p>
                                                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                                    {tx.created_at && (
                                                        <span>
                                                            {formatUTCDateTime(tx.created_at)}
                                                        </span>
                                                    )}
                                                    {tx.reference && (
                                                        <span className="truncate">
                                                            {tx.reference}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ml-3 shrink-0 text-right">
                                            <p
                                                className={`text-sm font-bold ${
                                                    tx.transaction_type === "debit"
                                                        ? "text-destructive"
                                                        : "text-success"
                                                }`}
                                            >
                                                {tx.transaction_type === "debit" ? "-" : "+"}
                                                {formatCurrency(Math.abs(tx.amount))}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Bal: {formatCurrency(tx.balance_after)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-end gap-2 border-t border-border/70 px-4 py-3 sm:px-5">
                                    <button
                                        type="button"
                                        disabled={txPage === 0}
                                        onClick={() => setTxPage((p) => p - 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={txPage === totalPages - 1}
                                        onClick={() => setTxPage((p) => p + 1)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

            {!isLoading && !error && wallet && wallet.transactions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center shadow-sm">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <CreditCard size={18} />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                        No transactions yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Top up your wallet to start seeing activity here.
                    </p>
                </div>
            )}
        </div>
    );
}
