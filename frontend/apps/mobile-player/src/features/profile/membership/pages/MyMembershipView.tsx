import { ScrollView, Text, View, Pressable } from "react-native";
import { useState, type JSX } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { MembershipSubscription } from "@repo/player-domain";
import { formatUTCDate, formatCurrency } from "../../../../lib";
import { STATUS_STYLES, FALLBACK_STYLE } from "../constants/membershipConstants";

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }): JSX.Element {
    return (
        <Text className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.6px] text-[#9CA3AF]">
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
                <Text className="text-[14px] text-[#6B7280]">{label}</Text>
                <Text className="text-[14px] font-semibold text-[#111827]">{value ?? "—"}</Text>
            </View>
            {!last && <View className="mx-4 h-px bg-[#F3F4F6]" />}
        </>
    );
}

// ─── main view ──────────────────────────────────────────────────────────────

type Props = {
    membership: MembershipSubscription;
    onCancel: () => void;
    isCancelling: boolean;
    cancelError: string | null;
};

export function MyMembershipView({
    membership,
    onCancel,
    isCancelling,
    cancelError,
}: Props): JSX.Element {
    const [showConfirm, setShowConfirm] = useState(false);
    const { plan, status } = membership;
    const style = STATUS_STYLES[status] ?? FALLBACK_STYLE;
    const billingPeriod = plan.billing_period === "annual" ? "year" : "month";
    const canCancel =
        (status === "active" || status === "trialing") && !membership.cancel_at_period_end;

    return (
        <ScrollView
            className="flex-1 bg-[#F2F3F7]"
            contentContainerClassName="px-4 pb-12 pt-5"
            showsVerticalScrollIndicator={false}
        >
            {/* ── Hero membership card ───────────────────────────────── */}
            <View className="mb-5 overflow-hidden rounded-[24px] bg-[#1D2B4F] shadow-lg">
                {/* Top: plan name + status + price */}
                <View className="flex-row items-start justify-between px-5 pt-5 pb-4">
                    <View className="flex-1 pr-4">
                        {/* Status pill */}
                        <View
                            className={`mb-2 self-start rounded-full px-3 py-0.5 ${
                                status === "active" || status === "trialing"
                                    ? "bg-[#22C55E]/20"
                                    : "bg-white/15"
                            }`}
                        >
                            <Text
                                className={`text-[11px] font-bold uppercase tracking-[0.5px] ${
                                    status === "active" || status === "trialing"
                                        ? "text-[#4ADE80]"
                                        : "text-white/60"
                                }`}
                            >
                                {style.label}
                            </Text>
                        </View>

                        <Text className="text-[26px] font-bold leading-tight text-white">
                            {plan.name}
                        </Text>
                        {!!plan.description && (
                            <Text className="mt-1 text-[13px] leading-5 text-white/55">
                                {plan.description}
                            </Text>
                        )}
                    </View>

                    {/* Price block */}
                    <View className="items-end">
                        <Text className="text-[22px] font-extrabold text-white">
                            {formatCurrency(plan.price)}
                        </Text>
                        <Text className="text-[12px] text-white/55">/ {billingPeriod}</Text>
                    </View>
                </View>

                {/* Divider */}
                <View className="mx-5 h-px bg-white/10" />

                {/* Bottom: membership icon + renews */}
                <View className="flex-row items-center justify-between px-5 py-4">
                    <View className="flex-row items-center gap-2.5">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                            <Ionicons name="ribbon" size={18} color="#93C5FD" />
                        </View>
                        <Text className="text-[13px] font-medium text-white/70">Member plan</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <Ionicons
                            name="refresh-circle-outline"
                            size={14}
                            color="rgba(255,255,255,0.45)"
                        />
                        <Text className="text-[12px] text-white/45">
                            Renews {formatUTCDate(membership.current_period_end)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ── Billing ───────────────────────────────────────────── */}
            <SectionLabel label="Billing" />
            <View className="mb-5 overflow-hidden rounded-[20px] bg-white shadow-sm">
                {/* Section header row */}
                <View className="flex-row items-center gap-3 border-b border-[#F3F4F6] px-4 py-3.5">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#EFF6FF]">
                        <Ionicons name="card-outline" size={16} color="#3B82F6" />
                    </View>
                    <Text className="text-[15px] font-semibold text-[#111827]">
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
                    last={!membership.cancel_at_period_end}
                />

                {membership.cancel_at_period_end && (
                    <View className="mx-4 mb-3.5 mt-1 flex-row items-start gap-2 rounded-xl bg-[#FEF3C7] px-3.5 py-3">
                        <Ionicons
                            name="warning-outline"
                            size={14}
                            color="#D97706"
                            style={{ marginTop: 1 }}
                        />
                        <Text className="flex-1 text-[12px] font-medium leading-5 text-[#92400E]">
                            Cancels on {formatUTCDate(membership.current_period_end)} — you keep
                            full access until then
                        </Text>
                    </View>
                )}
            </View>

            {/* ── Usage ─────────────────────────────────────────────── */}
            <SectionLabel label="Usage" />
            <View className="mb-5 overflow-hidden rounded-[20px] bg-white shadow-sm">
                <View className="flex-row items-center gap-3 border-b border-[#F3F4F6] px-4 py-3.5">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#F0FDF4]">
                        <Ionicons name="ticket-outline" size={16} color="#22C55E" />
                    </View>
                    <Text className="text-[15px] font-semibold text-[#111827]">
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
                    <View className="mb-5 overflow-hidden rounded-[20px] bg-white shadow-sm">
                        <View className="flex-row items-center gap-3 border-b border-[#F3F4F6] px-4 py-3.5">
                            <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#FAF5FF]">
                                <Ionicons name="star-outline" size={16} color="#A855F7" />
                            </View>
                            <Text className="text-[15px] font-semibold text-[#111827]">
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
                        <View className="w-full flex-row items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                            <Text className="flex-1 text-[13px] font-medium text-red-600">
                                {cancelError}
                            </Text>
                        </View>
                    )}

                    {showConfirm ? (
                        <View className="w-full overflow-hidden rounded-[20px] border border-red-100 bg-white shadow-sm">
                            <View className="px-5 pt-5 pb-4">
                                <Text className="text-[16px] font-bold text-[#111827]">
                                    Cancel membership?
                                </Text>
                                <Text className="mt-1.5 text-[13px] leading-5 text-[#6B7280]">
                                    You&apos;ll keep full access until{" "}
                                    <Text className="font-semibold text-[#111827]">
                                        {formatUTCDate(membership.current_period_end)}
                                    </Text>
                                    . After that, your membership will not renew.
                                </Text>
                            </View>
                            <View className="flex-row gap-3 border-t border-[#F3F4F6] px-4 py-4">
                                <Pressable
                                    className="flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] py-3 active:opacity-70"
                                    accessibilityRole="button"
                                    accessibilityLabel="Keep membership"
                                    disabled={isCancelling}
                                    onPress={() => setShowConfirm(false)}
                                >
                                    <Text className="text-[14px] font-semibold text-[#374151]">
                                        Keep it
                                    </Text>
                                </Pressable>
                                <Pressable
                                    className="flex-1 items-center justify-center rounded-xl bg-red-500 py-3 active:opacity-70 disabled:opacity-50"
                                    accessibilityRole="button"
                                    accessibilityLabel="Confirm cancel membership"
                                    disabled={isCancelling}
                                    onPress={onCancel}
                                >
                                    <Text className="text-[14px] font-semibold text-white">
                                        {isCancelling ? "Cancelling…" : "Yes, cancel"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    ) : (
                        <Text className="text-[13px] text-[#9CA3AF]">
                            Want to leave?{" "}
                            <Text
                                className="font-semibold text-red-400"
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
