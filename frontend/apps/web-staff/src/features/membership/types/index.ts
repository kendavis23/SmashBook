export type {
    MembershipPlan,
    MembershipPlanInput,
    MembershipPlanUpdateInput,
    BillingPeriod,
    MembershipStatus,
    CreditType,
} from "@repo/staff-domain/models";

export type MembershipTab = "plans";

export const BILLING_PERIOD_LABELS: Record<string, string> = {
    monthly: "Monthly",
    annual: "Annual",
};

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
    trialing: "Trial",
    active: "Active",
    paused: "Paused",
    cancelled: "Cancelled",
    expired: "Expired",
};
