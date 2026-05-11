import { useCallback } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { useSavePaymentMethod } from "@repo/player-domain/hooks";

export function useSaveCard() {
    const stripe = useStripe();
    const elements = useElements();
    const savePaymentMethod = useSavePaymentMethod();

    const confirmSetup = useCallback(
        async (clientSecret: string): Promise<string> => {
            if (!stripe || !elements) throw new Error("Stripe not loaded.");

            const { error } = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/settings/payment-methods`,
                },
                redirect: "if_required",
            });

            if (error) throw new Error(error.message ?? "Failed to save card.");

            const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret);
            const paymentMethodId = setupIntent?.payment_method as string | null;

            if (!paymentMethodId) throw new Error("Could not retrieve saved card — please try again.");

            await savePaymentMethod.mutateAsync({
                payment_method_id: paymentMethodId,
                set_as_default: true,
            });

            // invalidateQueries is handled by useSavePaymentMethod.onSuccess — no duplicate needed

            return paymentMethodId;
        },
        [stripe, elements, savePaymentMethod]
    );

    return { confirmSetup };
}
