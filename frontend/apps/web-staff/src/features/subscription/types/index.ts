export type {
    Subscription,
    SubscriptionStatus,
    PlanLimits,
    UsageCounts,
    PlanFeatures,
    InvoiceItem,
    SetupIntent,
    UpdatePaymentMethodInput,
    UpdatePaymentMethodResult,
} from "@repo/staff-domain/models";

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
    trialing: "Trial",
    active: "Active",
    past_due: "Past Due",
    canceled: "Canceled",
    suspended: "Suspended",
};
