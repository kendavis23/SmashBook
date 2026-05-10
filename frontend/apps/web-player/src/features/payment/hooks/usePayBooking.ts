import { useState, useCallback } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCreatePaymentIntent } from "@repo/player-domain/hooks";
import type { PaymentStep } from "../types";
import type { PlayerBookingItem } from "../../booking/types";

export function usePayBooking(booking: PlayerBookingItem) {
    const stripe = useStripe();
    const elements = useElements();
    const queryClient = useQueryClient();
    const createPaymentIntent = useCreatePaymentIntent();

    const [step, setStep] = useState<PaymentStep>({ id: "loading" });
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    const initPayment = useCallback(
        async (paymentMethodId?: string | null) => {
            setStep({ id: "loading" });
            try {
                const intent = await createPaymentIntent.mutateAsync({
                    booking_id: booking.booking_id,
                    payment_method_id: paymentMethodId ?? null,
                });
                setClientSecret(intent.client_secret);
            } catch (err) {
                setStep({
                    id: "error",
                    message:
                        (err as { message?: string })?.message ??
                        "Unable to start payment — please try again.",
                });
            }
        },
        [booking.booking_id, createPaymentIntent]
    );

    const confirmPayment = useCallback(async () => {
        if (!stripe || !elements || !clientSecret) return;
        setStep({ id: "confirming" });

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/bookings`,
            },
            redirect: "if_required",
        });

        if (error) {
            setStep({ id: "error", message: error.message ?? "Payment failed." });
            return;
        }

        queryClient.invalidateQueries({ queryKey: ["player", "bookings"] });

        const paymentElement = elements.getElement("payment");
        // amount/currency are available on the PaymentIntent; we pass them from the modal
        // This is signalled to the parent via onSuccess callback instead
        void paymentElement;
        setStep({ id: "success", amount: booking.amount_due, currency: "gbp" });
    }, [stripe, elements, clientSecret, queryClient, booking.amount_due]);

    return { step, setStep, clientSecret, initPayment, confirmPayment };
}
