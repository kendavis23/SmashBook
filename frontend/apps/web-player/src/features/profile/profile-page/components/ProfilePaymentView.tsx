import { type JSX, useState, useCallback, useEffect } from "react";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { config } from "@repo/config";
import {
    useListPaymentMethods,
    useCreateSetupIntent,
    useSavePaymentMethod,
    useDeletePaymentMethod,
    useSetDefaultPaymentMethod,
} from "@repo/player-domain/hooks";
import { AlertToast, ConfirmDeleteModal } from "@repo/ui";
import { Lock, Plus, Star, Trash2, X } from "lucide-react";
import type { PaymentMethod } from "@repo/player-domain/models";

const stripePromise = loadStripe(config.stripePublishableKey);

// ── Card tile (credit-card proportions) ──────────────────────────────────────


function CardTile({
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
    const base = card.is_default
        ? "bg-cta/10 border-cta/50"
        : "bg-background border-border";

    return (
        <div className={`group relative flex items-center gap-3 rounded-lg border p-3 shadow-sm transition hover:shadow-md ${base}`}>
            {/* Chip icon */}
            <div className="shrink-0">
                <div className="h-4 w-6 rounded-sm bg-gradient-to-br from-yellow-300/80 to-yellow-500/60 shadow-inner" />
            </div>

            {/* Card info */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                        •••• {card.last4}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{card.brand}</span>
                    {card.is_default && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-cta/20 px-1.5 py-0.5 text-[8px] font-semibold text-cta-foreground">
                            <Star size={7} fill="currentColor" />
                            Default
                        </span>
                    )}
                </div>
                <p className="text-[9px] text-muted-foreground">
                    Exp {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                </p>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
                {!card.is_default && (
                    <button
                        type="button"
                        disabled={isSettingDefault}
                        onClick={() => onSetDefault(card.id)}
                        className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground disabled:opacity-40"
                    >
                        Set default
                    </button>
                )}
                <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => onDelete(card.id)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    aria-label="Remove card"
                >
                    <Trash2 size={10} />
                </button>
            </div>
        </div>
    );
}

// ── Add-card form (must live inside <Elements>) ───────────────────────────────

function AddCardInner({
    clientSecret,
    onSuccess,
    onCancel,
    canCancel,
}: {
    clientSecret: string;
    onSuccess: () => void;
    onCancel: () => void;
    canCancel: boolean;
}): JSX.Element {
    const stripe = useStripe();
    const elements = useElements();
    const queryClient = useQueryClient();
    const savePaymentMethod = useSavePaymentMethod();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        if (!stripe || !elements) return;
        setIsPending(true);
        setError(null);

        const { error: stripeError } = await stripe.confirmSetup({
            elements,
            confirmParams: { return_url: `${window.location.origin}/profile` },
            redirect: "if_required",
        });

        if (stripeError) {
            setIsPending(false);
            setError(stripeError.message ?? "Failed to save card.");
            return;
        }

        const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);
        const paymentMethodId = setupIntent?.payment_method as string | null;

        if (!paymentMethodId) {
            setIsPending(false);
            setError("Could not retrieve saved card — please try again.");
            return;
        }

        try {
            await savePaymentMethod.mutateAsync({ payment_method_id: paymentMethodId, set_as_default: false });
        } catch (err) {
            setIsPending(false);
            setError((err as { message?: string })?.message ?? "Failed to save card.");
            return;
        }

        setIsPending(false);
        queryClient.invalidateQueries({ queryKey: ["player", "payment-methods"] });
        onSuccess();
    }, [stripe, elements, clientSecret, savePaymentMethod, queryClient, onSuccess]);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock size={11} />
                Secure &amp; encrypted
            </div>

            <PaymentElement options={{ layout: "tabs" }} />

            {error && (
                <AlertToast title={error} variant="error" onClose={() => setError(null)} />
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
                {canCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="btn-outline px-4 text-sm"
                        disabled={isPending}
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void handleSubmit()}
                    className="btn-cta flex items-center justify-center gap-2 px-4 text-sm"
                >
                    {isPending ? (
                        <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cta-foreground/40 border-t-cta-foreground" />
                            Saving…
                        </>
                    ) : (
                        "Save card"
                    )}
                </button>
            </div>
        </div>
    );
}

// ── Main payment view ─────────────────────────────────────────────────────────

export function ProfilePaymentView(): JSX.Element {
    const { data: methods, isLoading, error } = useListPaymentMethods();
    const createSetupIntent = useCreateSetupIntent();
    const deleteMutation = useDeletePaymentMethod();
    const setDefaultMutation = useSetDefaultPaymentMethod();

    const [showAddCard, setShowAddCard] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [successToast, setSuccessToast] = useState<string | null>(null);

    const hasCards = !isLoading && !error && !!methods && methods.length > 0;
    const isAddCardOpen = showAddCard || (!isLoading && !error && !hasCards);

    // Auto-init setup intent when add card form should open
    useEffect(() => {
        if (!isAddCardOpen || clientSecret) return;
        let cancelled = false;

        createSetupIntent.mutateAsync()
            .then((intent) => { if (!cancelled) setClientSecret(intent.client_secret); })
            .catch((err) => { if (!cancelled) setSetupError((err as { message?: string })?.message ?? "Unable to set up card."); });

        return () => { cancelled = true; };
        // intentionally run only when isAddCardOpen flips to true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAddCardOpen]);

    const handleDeleteRequest = useCallback((id: string) => { setDeleteTargetId(id); }, []);

    const handleDeleteConfirm = useCallback(() => {
        if (!deleteTargetId) return;
        deleteMutation.mutate(deleteTargetId, {
            onSuccess: () => {
                setSuccessToast("Card removed successfully.");
                setDeleteTargetId(null);
            },
            onError: () => { setDeleteTargetId(null); },
        });
    }, [deleteTargetId, deleteMutation]);

    const handleSetDefault = useCallback((id: string) => {
        setDefaultMutation.mutate(id, {
            onSuccess: () => { setSuccessToast("Default payment method updated."); },
        });
    }, [setDefaultMutation]);

    const handleAddDone = useCallback(() => {
        setShowAddCard(false);
        setClientSecret(null);
        setSetupError(null);
    }, []);

    const handleAddSuccess = useCallback(() => {
        handleAddDone();
        setSuccessToast("Card saved successfully.");
    }, [handleAddDone]);

    const handleOpenAdd = useCallback(() => {
        setSetupError(null);
        setClientSecret(null);
        setShowAddCard(true);
    }, []);

    return (
        <div className="space-y-5">
            {successToast && (
                <AlertToast title={successToast} variant="success" onClose={() => setSuccessToast(null)} />
            )}

            {deleteTargetId && (
                <ConfirmDeleteModal
                    title="Remove card"
                    description="Are you sure you want to remove this card? This action cannot be undone."
                    saving={deleteMutation.isPending}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeleteTargetId(null)}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Payment methods</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Saved cards for booking payments.</p>
                </div>
                {hasCards && !showAddCard && (
                    <button
                        type="button"
                        onClick={() => void handleOpenAdd()}
                        className="flex items-center gap-1.5 rounded-lg bg-cta px-3 py-1.5 text-xs font-semibold text-cta-foreground shadow-sm transition hover:opacity-90"
                    >
                        <Plus size={12} />
                        Add card
                    </button>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center gap-2 py-3">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-cta" />
                    <span className="text-xs text-muted-foreground">Loading…</span>
                </div>
            )}

            {/* List error */}
            {!isLoading && error && (
                <p className="text-xs text-destructive">Failed to load payment methods.</p>
            )}

            {/* Saved cards */}
            {hasCards && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {[...methods!].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0)).map((card) => (
                        <CardTile
                            key={card.id}
                            card={card}
                            onDelete={handleDeleteRequest}
                            onSetDefault={handleSetDefault}
                            isDeleting={deleteMutation.isPending && deleteMutation.variables === card.id}
                            isSettingDefault={setDefaultMutation.isPending && setDefaultMutation.variables === card.id}
                        />
                    ))}
                </div>
            )}

            {/* Add card panel */}
            {isAddCardOpen && (
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-semibold text-foreground">Add new card</h4>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">Your card details are encrypted and secure.</p>
                        </div>
                        {hasCards && (
                            <button
                                type="button"
                                onClick={handleAddDone}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                aria-label="Close"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {setupError && (
                        <AlertToast title={setupError} variant="error" onClose={() => setSetupError(null)} />
                    )}

                    {!clientSecret && !setupError && (
                        <div className="flex items-center gap-2 py-4">
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-cta" />
                            <span className="text-xs text-muted-foreground">Preparing…</span>
                        </div>
                    )}

                    {clientSecret && (
                        <Elements
                            stripe={stripePromise}
                            options={{
                                clientSecret,
                                appearance: { theme: "stripe", variables: { borderRadius: "8px" } },
                            }}
                        >
                            <AddCardInner
                                clientSecret={clientSecret}
                                onSuccess={handleAddSuccess}
                                onCancel={handleAddDone}
                                canCancel={hasCards}
                            />
                        </Elements>
                    )}
                </div>
            )}
        </div>
    );
}
