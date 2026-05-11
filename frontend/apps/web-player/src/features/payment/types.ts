import type { PaymentMethod } from "@repo/player-domain/models";
import type { PlayerBookingItem } from "../booking/types";

export type { PaymentMethod };

export type PaymentStep =
    | { id: "loading" }
    | { id: "choose_card"; methods: PaymentMethod[] }
    | { id: "select_method"; methods: PaymentMethod[]; chosenCard: PaymentMethod }
    | { id: "new_card" }
    | { id: "save_card"; setupClientSecret: string }
    | { id: "confirming" }
    | { id: "success"; amount: number; currency: string }
    | { id: "error"; message: string };

export type PaymentModalContext =
    | { type: "booking"; booking: PlayerBookingItem }
    | { type: "add_card" };

export interface PaymentModalProps {
    context: PaymentModalContext;
    onClose: () => void;
    onSuccess?: () => void;
}
