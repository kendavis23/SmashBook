import { useCallback } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";

export function useSaveCard() {
    const stripe = useStripe();
    const elements = useElements();
    const queryClient = useQueryClient();

    const confirmSetup = useCallback(async () => {
        if (!stripe || !elements) throw new Error("Stripe not loaded.");

        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/settings/payment-methods`,
            },
            redirect: "if_required",
        });

        if (error) throw new Error(error.message ?? "Failed to save card.");

        queryClient.invalidateQueries({ queryKey: ["player", "payment-methods"] });
    }, [stripe, elements, queryClient]);

    return { confirmSetup };
}
