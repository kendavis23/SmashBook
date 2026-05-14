import { type JSX, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import { useGetWallet, useTopUpWallet, useListPaymentMethods } from "@repo/player-domain/hooks";
import { AlertToast, SelectInput, formatCurrency, formatUTCDateTime } from "@repo/ui";
import type { SelectOption } from "@repo/ui";
import { ArrowDownToLine, ChevronLeft, ChevronRight, RefreshCw, Wallet } from "lucide-react";

const PAGE_SIZE = 8;
import type { PaymentMethod } from "@repo/player-domain/models";

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
        <div className="border-t border-border pt-3">
            {error && (
                <div className="mb-3">
                    <AlertToast title={error} variant="error" onClose={() => setError(null)} />
                </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
                {/* Amount + Card picker row */}
                <div className="flex flex-1 gap-2">
                    {/* Amount */}
                    <div className="w-28 shrink-0">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Amount
                        </p>
                        <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                £
                            </span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                placeholder="0.00"
                                value={amountInput}
                                onChange={(e) => setAmountInput(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background py-1.5 pl-6 pr-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:border-cta focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Card picker */}
                    <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Pay with
                        </p>
                        {methods.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground">No saved cards.</p>
                        ) : (
                            <SelectInput
                                name="card"
                                value={selectedMethodId}
                                options={cardOptions}
                                onValueChange={(v) => setSelectedMethodId(v)}
                                placeholder="Select card"
                                className="input-base py-1.5 text-xs"
                            />
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={topUp.isPending}
                        className="btn-outline px-3 py-1.5 text-xs"
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
                        className="btn-cta flex items-center gap-1.5 px-3 py-1.5 text-xs"
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
        <div className="space-y-4">
            {successToast && (
                <AlertToast
                    title={successToast}
                    variant="success"
                    onClose={() => setSuccessToast(null)}
                />
            )}

            {/* Balance + top-up panel */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                {/* Balance row */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            Wallet balance
                        </p>
                        {isLoading ? (
                            <div className="mt-0.5 flex items-center gap-2">
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-cta" />
                                <span className="text-xs text-muted-foreground">Loading…</span>
                            </div>
                        ) : error ? (
                            <p className="mt-0.5 text-xs text-destructive">
                                Failed to load wallet.
                            </p>
                        ) : (
                            <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                                {formatCurrency(wallet?.balance ?? 0)}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isLoading}
                            aria-label="Refresh wallet"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                        >
                            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                        </button>
                        {!showTopUp && (
                            <button
                                type="button"
                                onClick={() => setShowTopUp(true)}
                                className="flex items-center gap-1 rounded-lg bg-cta px-2.5 py-1 text-[11px] font-semibold text-cta-foreground shadow-sm transition hover:opacity-90"
                            >
                                <ArrowDownToLine size={11} />
                                Top up
                            </button>
                        )}
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cta/10 text-cta">
                            <Wallet size={15} />
                        </div>
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
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Recent transactions
                                </h4>
                                {totalPages > 1 && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {txPage + 1} / {totalPages}
                                    </span>
                                )}
                            </div>
                            <div className="divide-y divide-border rounded-xl border border-border bg-card">
                                {pageTxs.map((tx) => (
                                    <div
                                        key={tx.id}
                                        className="flex items-center justify-between px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium capitalize text-foreground">
                                                {tx.transaction_type.replace(/_/g, " ")}
                                            </p>
                                            {tx.reference && (
                                                <p className="truncate text-[10px] text-muted-foreground">
                                                    {tx.reference}
                                                </p>
                                            )}
                                            {tx.created_at && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    {formatUTCDateTime(tx.created_at)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="ml-3 shrink-0 text-right">
                                            <p
                                                className={`text-xs font-semibold ${
                                                    tx.transaction_type === "debit"
                                                        ? "text-destructive"
                                                        : "text-success"
                                                }`}
                                            >
                                                {tx.transaction_type === "debit" ? "-" : "+"}
                                                {formatCurrency(Math.abs(tx.amount))}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Bal: {formatCurrency(tx.balance_after)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {totalPages > 1 && (
                                <div className="mt-2 flex items-center justify-end gap-1">
                                    <button
                                        type="button"
                                        disabled={txPage === 0}
                                        onClick={() => setTxPage((p) => p - 1)}
                                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={12} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={txPage === totalPages - 1}
                                        onClick={() => setTxPage((p) => p + 1)}
                                        className="flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

            {!isLoading && !error && wallet && wallet.transactions.length === 0 && (
                <p className="text-xs text-muted-foreground">No transactions yet.</p>
            )}
        </div>
    );
}
