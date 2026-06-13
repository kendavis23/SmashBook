import type { PaymentMethod } from "@repo/player-domain";
import type { PlayerBookingItem } from "../../booking/types";

export type { PaymentMethod };

/**
 * Multi-step state machine for the mobile booking payment flow.
 * Mirrors the web-player PaymentModal steps, adapted for the native
 * Stripe React Native SDK (CardField + confirmPayment / confirmSetupIntent).
 */
export type PaymentStep =
    | { id: "loading" }
    | { id: "choose"; methods: PaymentMethod[] }
    | { id: "new_card" }
    | { id: "confirming" }
    | { id: "success"; amount: number; currency: string; method: "card" | "wallet" }
    | { id: "error"; message: string };

export type PaymentContext = { type: "booking"; booking: PlayerBookingItem };

export type PaymentSheetProps = {
    visible: boolean;
    context: PaymentContext | null;
    onClose: () => void;
    onSuccess?: () => void;
};
