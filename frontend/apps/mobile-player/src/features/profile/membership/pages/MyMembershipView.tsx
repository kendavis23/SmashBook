import { ScrollView, Text, View, Pressable } from "react-native";
import { useState, type JSX } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { MembershipSubscription } from "@repo/player-domain";
import { formatUTCDate, formatCurrency } from "../../../../lib";
import { useThemeColors } from "../../../../theme";
import { STATUS_STYLES, FALLBACK_STYLE } from "../constants/membershipConstants";

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }): JSX.Element {
    return (
        <Text className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground">
            {label}
        </Text>
    );
}

function InfoRow({
    label,
    value,
    last = false,
}: {
    label: string;
    value: string | number | null;
    last?: boolean;
}): JSX.Element {
    return (
        <>
            <View className="flex-row items-center justify-between px-4 py-3.5">
                <Text className="text-[14px] text-muted-foreground">{label}</Text>
                <Text className="text-[14px] font-semibold text-foreground">{value ?? "—"}</Text>
            </View>
            {!last && <View className="mx-4 h-px bg-muted" />}
        </>
    );
}

// ─── main view ──────────────────────────────────────────────────────────────

type Props = {
    membership: MembershipSubscription;
    onCancel: () => void;
    isCancelling: boolean;
    cancelError: string | null;
    onCancelPendingDowngrade: () => void;
    isCancellingDowngrade: boolean;
    cancelDowngradeError: string | null;
};

export function MyMembershipView({
    membership,
    onCancel,
    isCancelling,
    cancelError,
    onCancelPendingDowngrade,
    isCancellingDowngrade,
    cancelDowngradeError,
}: Props): JSX.Element {
    const colors = useThemeColors();
    const [showConfirm, setShowConfirm] = useState(false);
    const { plan, status } = membership;
    const style = STATUS_STYLES[status] ?? FALLBACK_STYLE;
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";
    const canCancel =
        (status === "active" || status === "trialing") && !membership.cancel_at_period_end;

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="px-4 pb-12 pt-5"
            showsVerticalScrollIndicator={false}
        >
            {/* ── Hero membership card ───────────────────────────────── */}
            <View className="mb-5 overflow-hidden rounded-[24px] bg-hero shadow-lg">
                {/* Top: plan name + status + price */}
                <View className="flex-row items-start justify-between px-5 pt-5 pb-4">
                    <View className="flex-1 pr-4">
                        {/* Status pill */}
                        <View
                            className={`mb-2 self-start rounded-full px-3 py-0.5 ${
                                status === "active" || status === "trialing"
                                    ? "bg-success/20"
                                    : "bg-card/15"
                            }`}
                        >
                            <Text
                                className={`text-[11px] font-bold uppercase tracking-[0.5px] ${
                                    status === "active" || status === "trialing"
                                        ? "text-success"
                                        : "text-cta-foreground/60"
                                }`}
                            >
                                {style.label}
                            </Text>
                        </View>

                        <Text className="text-[26px] font-bold leading-tight text-cta-foreground">
                            {plan.name}
                        </Text>
                        {!!plan.description && (
                            <Text className="mt-1 text-[13px] leading-5 text-cta-foreground/55">
                                {plan.description}
                            </Text>
                        )}
                    </View>

                    {/* Price block */}
                    <View className="items-end">
                        <Text className="text-[22px] font-extrabold text-cta-foreground">
                            {formatCurrency(plan.price)}
                        </Text>
                        <Text className="text-[12px] text-cta-foreground/55">
                            / {billingPeriod}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View className="mx-5 h-px bg-card/10" />

                {/* Bottom: membership icon + renews */}
                <View className="flex-row items-center justify-between px-5 py-4">
                    <View className="flex-row items-center gap-2.5">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-card/10">
                            <Ionicons name="ribbon" size={18} color={colors.heroMuted} />
                        </View>
                        <Text className="text-[13px] font-medium text-cta-foreground/70">
                            Member plan
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons
                            name="refresh-circle-outline"
                            size={14}
                            color={colors.heroGlassBorder}
                        />
                        <Text className="text-[12px] text-cta-foreground/45">
                            Renews {formatUTCDate(membership.current_period_end)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ── Billing ───────────────────────────────────────────── */}
            <SectionLabel label="Billing" />
            <View className="mb-5 overflow-hidden rounded-[20px] bg-card shadow-sm">
                {/* Section header row */}
                <View className="flex-row items-center gap-3 border-b border-border px-4 py-3.5">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                        <Ionicons name="card-outline" size={16} color={colors.cta} />
                    </View>
                    <Text className="text-[15px] font-semibold text-foreground">
                        Billing details
                    </Text>
                </View>

                <InfoRow label="Price" value={`${formatCurrency(plan.price)} / ${billingPeriod}`} />
                <InfoRow
                    label="Period start"
                    value={formatUTCDate(membership.current_period_start)}
                />
                <InfoRow
                    label="Period end"
                    value={formatUTCDate(membership.current_period_end)}
                    last
                />
            </View>

            {/* ── Scheduled changes ─────────────────────────────────── */}
            {(membership.cancel_at_period_end || membership.pending_plan_id !== null) && (
                <>
                    <SectionLabel label="Scheduled changes" />
                    <View className="mb-5 overflow-hidden rounded-[20px] bg-card shadow-sm">
                        <View className="flex-row items-center gap-3 border-b border-border px-4 py-3.5">
                            <View className="h-8 w-8 items-center justify-center rounded-xl bg-warning/10">
                                <Ionicons name="time-outline" size={16} color={colors.warning} />
                            </View>
                            <Text className="text-[15px] font-semibold text-foreground">
                                Takes effect at period end
                            </Text>
                        </View>

                        <View className="mx-4 mb-1 mt-3 flex-row items-start gap-2 rounded-xl bg-warning/10 px-3.5 py-3">
                            <Ionicons
                                name="warning-outline"
                                size={14}
                                color={colors.warning}
                                style={{ marginTop: 1 }}
                            />
                            <Text className="flex-1 text-[12px] font-medium leading-5 text-warning">
                                {membership.cancel_at_period_end
                                    ? `Your membership cancels on ${formatUTCDate(membership.current_period_end)}. You keep full access until then.`
                                    : `Your plan change takes effect on ${formatUTCDate(membership.current_period_end)}.`}
                            </Text>
                        </View>

                        {!!cancelDowngradeError && (
                            <View className="mx-4 mb-1 flex-row items-center gap-2 rounded-xl border border-destructive bg-destructive/10 px-3.5 py-3">
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={14}
                                    color={colors.destructive}
                                />
                                <Text className="flex-1 text-[12px] font-medium text-destructive">
                                    {cancelDowngradeError}
                                </Text>
                            </View>
                        )}

                        <Pressable
                            className="mx-4 mb-4 mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-muted py-3 active:opacity-70 disabled:opacity-50"
                            accessibilityRole="button"
                            accessibilityLabel="Stay with current plan"
                            disabled={isCancellingDowngrade}
                            onPress={onCancelPendingDowngrade}
                        >
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={15}
                                color={colors.foreground}
                            />
                            <Text className="text-[14px] font-semibold text-foreground">
                                {isCancellingDowngrade
                                    ? "Restoring plan…"
                                    : "Stay with current plan"}
                            </Text>
                        </Pressable>
                    </View>
                </>
            )}

            {/* ── Usage ─────────────────────────────────────────────── */}
            <SectionLabel label="Usage" />
            <View className="mb-5 overflow-hidden rounded-[20px] bg-card shadow-sm">
                <View className="flex-row items-center gap-3 border-b border-border px-4 py-3.5">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-success/10">
                        <Ionicons name="ticket-outline" size={16} color={colors.success} />
                    </View>
                    <Text className="text-[15px] font-semibold text-foreground">
                        Credits & perks
                    </Text>
                </View>

                <InfoRow
                    label="Booking credits remaining"
                    value={membership.credits_remaining}
                    last={
                        membership.guest_passes_remaining === null &&
                        plan.discount_pct === null &&
                        plan.priority_booking_days === null
                    }
                />

                {membership.guest_passes_remaining !== null && (
                    <InfoRow
                        label="Guest passes remaining"
                        value={membership.guest_passes_remaining}
                        last={plan.discount_pct === null && plan.priority_booking_days === null}
                    />
                )}
                {plan.discount_pct !== null && (
                    <InfoRow
                        label="Booking discount"
                        value={`${plan.discount_pct}%`}
                        last={plan.priority_booking_days === null}
                    />
                )}
                {plan.priority_booking_days !== null && (
                    <InfoRow
                        label="Priority booking window"
                        value={`${plan.priority_booking_days} days`}
                        last
                    />
                )}
            </View>

            {/* ── Plan allowances (conditional) ─────────────────────── */}
            {((plan.booking_credits_per_period ?? 0) > 0 ||
                (plan.guest_passes_per_period ?? 0) > 0) && (
                <>
                    <SectionLabel label="Plan allowances" />
                    <View className="mb-5 overflow-hidden rounded-[20px] bg-card shadow-sm">
                        <View className="flex-row items-center gap-3 border-b border-border px-4 py-3.5">
                            <View className="h-8 w-8 items-center justify-center rounded-xl bg-secondary">
                                <Ionicons name="star-outline" size={16} color={colors.cta} />
                            </View>
                            <Text className="text-[15px] font-semibold text-foreground">
                                Per period
                            </Text>
                        </View>
                        {(plan.booking_credits_per_period ?? 0) > 0 && (
                            <InfoRow
                                label="Credits per period"
                                value={plan.booking_credits_per_period}
                                last={(plan.guest_passes_per_period ?? 0) === 0}
                            />
                        )}
                        {(plan.guest_passes_per_period ?? 0) > 0 && (
                            <InfoRow
                                label="Guest passes per period"
                                value={plan.guest_passes_per_period}
                                last
                            />
                        )}
                    </View>
                </>
            )}

            {/* ── Cancel section ────────────────────────────────────── */}
            {canCancel && (
                <View className="mt-1 items-center gap-4">
                    {!!cancelError && (
                        <View className="w-full flex-row items-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-3">
                            <Ionicons
                                name="alert-circle-outline"
                                size={16}
                                color={colors.destructive}
                            />
                            <Text className="flex-1 text-[13px] font-medium text-destructive">
                                {cancelError}
                            </Text>
                        </View>
                    )}

                    {showConfirm ? (
                        <View className="w-full overflow-hidden rounded-[20px] border border-destructive bg-card shadow-sm">
                            <View className="px-5 pt-5 pb-4">
                                <Text className="text-[16px] font-bold text-foreground">
                                    Cancel membership?
                                </Text>
                                <Text className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                                    You&apos;ll keep full access until{" "}
                                    <Text className="font-semibold text-foreground">
                                        {formatUTCDate(membership.current_period_end)}
                                    </Text>
                                    . After that, your membership will not renew.
                                </Text>
                            </View>
                            <View className="flex-row gap-3 border-t border-border px-4 py-4">
                                <Pressable
                                    className="flex-1 items-center justify-center rounded-xl border border-border bg-muted py-3 active:opacity-70"
                                    accessibilityRole="button"
                                    accessibilityLabel="Keep membership"
                                    disabled={isCancelling}
                                    onPress={() => setShowConfirm(false)}
                                >
                                    <Text className="text-[14px] font-semibold text-foreground">
                                        Keep it
                                    </Text>
                                </Pressable>
                                <Pressable
                                    className="flex-1 items-center justify-center rounded-xl bg-destructive/100 py-3 active:opacity-70 disabled:opacity-50"
                                    accessibilityRole="button"
                                    accessibilityLabel="Confirm cancel membership"
                                    disabled={isCancelling}
                                    onPress={onCancel}
                                >
                                    <Text className="text-[14px] font-semibold text-cta-foreground">
                                        {isCancelling ? "Cancelling…" : "Yes, cancel"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <Text className="text-[13px] text-muted-foreground">
                            Want to leave?{" "}
                            <Text
                                className="font-semibold text-destructive"
                                accessibilityRole="button"
                                accessibilityLabel="Cancel membership"
                                onPress={() => setShowConfirm(true)}
                            >
                                Cancel membership
                            </Text>
                        </Text>
                    )}
                </View>
            )}
        </ScrollView>
    );
}
