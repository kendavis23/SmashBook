import type { JSX } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatUTCDate, formatUTCTime, formatCurrency } from "../../../lib";
import { useThemeColors } from "../../../theme";

export type BookingInfo = {
    courtName: string;
    startDatetime: string;
    endDatetime: string;
    originalPrice: number;
    discountAmount: number;
    discountSource: string | null;
    amountDue: number;
};

const DISCOUNT_SOURCE_LABELS: Record<string, string> = {
    membership: "Membership",
    campaign: "Campaign",
    promo_code: "Promo Code",
    staff_manual: "Staff Discount",
    ai_gap_offer: "Special Offer",
};

/** Read-only booking summary shown above the payment options. */
export function PaymentBookingInfo({ info }: { info: BookingInfo }): JSX.Element {
    const colors = useThemeColors();
    const hasDiscount = info.discountAmount > 0 && info.discountSource != null;
    const discountLabel = info.discountSource
        ? (DISCOUNT_SOURCE_LABELS[info.discountSource] ?? info.discountSource)
        : "Discount";

    return (
        <View className="gap-3 rounded-[20px] bg-card px-4 py-4 shadow-sm">
            <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-secondary">
                    <Ionicons name="location-outline" size={16} color={colors.cta} />
                </View>
                <View className="flex-1">
                    <Text className="text-[15px] font-bold text-foreground" numberOfLines={1}>
                        {info.courtName}
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-muted-foreground" numberOfLines={1}>
                        {formatUTCDate(info.startDatetime)} · {formatUTCTime(info.startDatetime)} –{" "}
                        {formatUTCTime(info.endDatetime)}
                    </Text>
                </View>
            </View>

            {hasDiscount ? (
                <View className="flex-row overflow-hidden rounded-[14px] border border-border/60">
                    <View className="flex-1 px-3 py-2.5">
                        <Text className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Original
                        </Text>
                        <Text
                            className="mt-1 text-[13px] font-bold text-muted-foreground"
                            style={{ textDecorationLine: "line-through" }}
                        >
                            {formatCurrency(info.originalPrice)}
                        </Text>
                    </View>
                    <View className="flex-1 border-l border-border/60 px-3 py-2.5">
                        <Text className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {discountLabel}
                        </Text>
                        <Text className="mt-1 text-[13px] font-bold" style={{ color: colors.cta }}>
                            -{formatCurrency(info.discountAmount)}
                        </Text>
                    </View>
                    <View
                        className="flex-1 border-l border-border/60 px-3 py-2.5"
                        style={{ backgroundColor: colors.ctaSurface }}
                    >
                        <Text className="text-[9px] font-semibold uppercase tracking-wider text-cta">
                            Your share
                        </Text>
                        <Text className="mt-1 text-[13px] font-bold" style={{ color: colors.cta }}>
                            {formatCurrency(info.amountDue)}
                        </Text>
                    </View>
                </View>
            ) : (
                <View className="flex-row items-center justify-between border-t border-border/50 pt-3">
                    <Text className="text-[13px] font-semibold text-foreground">Total due</Text>
                    <Text className="text-[18px] font-bold" style={{ color: colors.cta }}>
                        {formatCurrency(info.amountDue)}
                    </Text>
                </View>
            )}
        </View>
    );
}
