import { loadStripe } from "@stripe/stripe-js";
import { config } from "@repo/config";

export const stripePromise = loadStripe(config.stripePublishableKey, {
    developerTools: { assistant: { enabled: false } },
});
