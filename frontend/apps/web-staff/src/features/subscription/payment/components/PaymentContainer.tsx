import { type JSX, useState, useCallback, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";
import { useGetSubscription, useCreateSetupIntent } from "../../hooks";
import type { Subscription } from "../../types";
import PaymentView from "./PaymentView";

// Initialise Stripe once — module-level so the promise is shared.
const stripePromise = loadStripe(config.stripePublishableKey, {
    developerTools: { assistant: { enabled: false } },
});

export default function PaymentContainer(): JSX.Element {
    const { data, isLoading, error, refetch } = useGetSubscription();
    const createSetupIntent = useCreateSetupIntent();

    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);
    const [isPreparingSetup, setIsPreparingSetup] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    // Incrementing this triggers a fresh setup-intent fetch (used after save or dismiss error).
    const [retryCount, setRetryCount] = useState(0);

    // Guard: prevents duplicate in-flight calls (StrictMode double-invoke, re-renders).
    const fetchingRef = useRef(false);
    // Guard against setting state after unmount.
    const cancelledRef = useRef(false);

    useEffect(() => {
        cancelledRef.current = false;
        return () => {
            cancelledRef.current = true;
        };
    }, []);

    // Fetch a setup-intent once per mount / explicit retry.
    // Keyed on `retryCount` only — not on clientSecret/setupError state — so a
    // re-render never triggers a second API call.
    useEffect(() => {
        if (fetchingRef.current) return; // already in-flight
        fetchingRef.current = true;
        setIsPreparingSetup(true);
        setClientSecret(null);
        setSetupError(null);

        createSetupIntent
            .mutateAsync()
            .then((intent) => {
                if (!cancelledRef.current) {
                    setClientSecret(intent.client_secret);
                    setIsPreparingSetup(false);
                }
            })
            .catch((err: unknown) => {
                if (!cancelledRef.current) {
                    setSetupError(
                        (err as { message?: string })?.message ?? "Unable to set up card form."
                    );
                    setIsPreparingSetup(false);
                }
            })
            .finally(() => {
                fetchingRef.current = false;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [retryCount]);

    const handleCardSaveSuccess = useCallback(() => {
        setSuccessMessage("Payment method updated successfully.");
        void refetch();
        // Fetch a fresh setup-intent so the form is ready for another update.
        setRetryCount((c) => c + 1);
    }, [refetch]);

    const handleCancelAddCard = useCallback(() => {
        window.history.back();
    }, []);

    const handleDismissSetupError = useCallback(() => {
        // Retry fetching a setup-intent.
        setRetryCount((c) => c + 1);
    }, []);

    return (
        <PaymentView
            subscription={(data as Subscription) ?? null}
            isLoading={isLoading}
            error={error as Error | null}
            stripePromise={stripePromise}
            clientSecret={clientSecret}
            setupError={setupError}
            isPreparingSetup={isPreparingSetup}
            onCardSaveSuccess={handleCardSaveSuccess}
            onCancelAddCard={handleCancelAddCard}
            onDismissSetupError={handleDismissSetupError}
            successMessage={successMessage}
            onDismissSuccess={() => setSuccessMessage(null)}
        />
    );
}
