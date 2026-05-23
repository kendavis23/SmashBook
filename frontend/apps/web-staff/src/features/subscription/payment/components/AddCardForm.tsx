import { type JSX, useState, useCallback } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { AlertToast } from "@repo/ui";
import { useUpdatePaymentMethod } from "../../hooks";

type Props = {
    clientSecret: string;
    onSuccess: () => void;
    onCancel: () => void;
};

/**
 * Rendered inside a Stripe <Elements> provider.
 * Confirms the setup-intent via Stripe JS (PCI-compliant — card data never
 * touches our servers) then registers the resulting payment-method ID with
 * our backend via useUpdatePaymentMethod.
 */
export function AddCardForm({ clientSecret, onSuccess, onCancel }: Props): JSX.Element {
    const stripe = useStripe();
    const elements = useElements();
    const updatePaymentMethod = useUpdatePaymentMethod();

    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = useCallback(async () => {
        if (!stripe || !elements) return;
        setIsPending(true);
        setError(null);

        // 1. Confirm setup via Stripe — card data stays in Stripe's iframe.
        const { error: stripeError } = await stripe.confirmSetup({
            elements,
            confirmParams: { return_url: `${window.location.origin}/subscription/payment` },
            redirect: "if_required",
        });

        if (stripeError) {
            setIsPending(false);
            setError(stripeError.message ?? "Failed to save card.");
            return;
        }

        // 2. Retrieve the resolved payment_method ID from the setup intent.
        const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);
        const paymentMethodId = setupIntent?.payment_method as string | null;

        if (!paymentMethodId) {
            setIsPending(false);
            setError("Could not retrieve saved card — please try again.");
            return;
        }

        // 3. Tell our backend to attach + set as default.
        try {
            await updatePaymentMethod.mutateAsync({ payment_method_id: paymentMethodId });
        } catch (err) {
            setIsPending(false);
            setError((err as { message?: string })?.message ?? "Failed to save card.");
            return;
        }

        setIsPending(false);
        onSuccess();
    }, [stripe, elements, clientSecret, updatePaymentMethod, onSuccess]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock size={11} />
                Secure &amp; encrypted — card details handled by Stripe
            </div>

            <PaymentElement options={{ layout: "tabs" }} />

            {error ? (
                <AlertToast title={error} variant="error" onClose={() => setError(null)} />
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isPending}
                    className="btn-outline px-4 text-sm"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={isPending || !stripe || !elements}
                    onClick={() => void handleSave()}
                    className="btn-cta flex items-center gap-2 px-4 text-sm"
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
