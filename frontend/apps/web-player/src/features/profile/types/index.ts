import type { NotificationChannel } from "@repo/auth";
import type { PaymentMethod, MembershipSubscription } from "@repo/player-domain/models";

export type ProfileTab = "info" | "notification" | "payment" | "membership";

export type { NotificationChannel, PaymentMethod, MembershipSubscription };
