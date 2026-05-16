import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { ReactNode } from "react";
import { config } from "@repo/config";

const stripePromise = loadStripe(config.stripePublishableKey);

export function StripeProvider({ children }: { children: ReactNode }) {
    return <Elements stripe={stripePromise}>{children}</Elements>;
}
