import { Elements } from "@stripe/react-stripe-js";
import type { ReactNode } from "react";
import { stripePromise } from "../lib/stripe";

export function StripeProvider({ children }: { children: ReactNode }) {
    return <Elements stripe={stripePromise}>{children}</Elements>;
}
