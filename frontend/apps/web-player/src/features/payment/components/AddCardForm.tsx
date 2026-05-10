import { type JSX, useState, useCallback } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import { useCreateSetupIntent } from "@repo/player-domain/hooks";
import { useSaveCard } from "../hooks/useSaveCard";
import { PaymentMethodStep } from "./PaymentMethodStep";
import { PaymentErrorBanner } from "./PaymentErrorBanner";

const stripePromise = loadStripe(config.stripePublishableKey);

function AddCardInner({ onSuccess }: { onSuccess: () => void }): JSX.Element {
    const { confirmSetup } = useSaveCard();
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(async () => {
        setIsPending(true);
        setError(null);
        try {
            await confirmSetup();
            onSuccess();
        } catch (err) {
            setError((err as { message?: string })?.message ?? "Failed to save card.");
        } finally {
            setIsPending(false);
        }
    }, [confirmSetup, onSuccess]);

    return (
        <div className="flex flex-col gap-4">
            <PaymentMethodStep
                amount={0}
                isConfirming={isPending}
                error={error}
                onSubmit={() => void handleSubmit()}
                onDismissError={() => setError(null)}
                submitLabel="Save card"
            />
        </div>
    );
}

interface Props {
    onSuccess?: () => void;
}

export function AddCardForm({ onSuccess }: Props): JSX.Element {
    const createSetupIntent = useCreateSetupIntent();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [initError, setInitError] = useState<string | null>(null);
    const [isInit, setIsInit] = useState(false);
    const [done, setDone] = useState(false);

    const handleStart = useCallback(async () => {
        setIsInit(true);
        setInitError(null);
        try {
            const intent = await createSetupIntent.mutateAsync();
            setClientSecret(intent.client_secret);
        } catch (err) {
            setInitError(
                (err as { message?: string })?.message ?? "Unable to start card setup."
            );
        } finally {
            setIsInit(false);
        }
    }, [createSetupIntent]);

    const handleSuccess = useCallback(() => {
        setDone(true);
        onSuccess?.();
    }, [onSuccess]);

    if (done) {
        return (
            <p className="text-sm font-medium text-success">Card saved successfully.</p>
        );
    }

    if (!clientSecret) {
        return (
            <div className="flex flex-col gap-3">
                {initError ? <PaymentErrorBanner message={initError} /> : null}
                <button
                    type="button"
                    disabled={isInit}
                    onClick={() => void handleStart()}
                    className="btn-primary"
                >
                    {isInit ? "Starting…" : "Add a new card"}
                </button>
            </div>
        );
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{
                clientSecret,
                appearance: { theme: "stripe", variables: { borderRadius: "8px" } },
            }}
        >
            <AddCardInner onSuccess={handleSuccess} />
        </Elements>
    );
}
