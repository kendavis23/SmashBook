/**
 * CardTile — renders a single saved payment method.
 *
 * PCI note: only the Stripe-vaulted metadata (last4, brand, expiry) is
 * displayed here. Raw card numbers are never handled by this app.
 */
import { type JSX, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PaymentMethod } from "@repo/player-domain";

type Props = {
    card: PaymentMethod;
    onDelete: (id: string) => void;
    onSetDefault: (id: string) => void;
    isDeleting: boolean;
    isSettingDefault: boolean;
};

export function CardTile({
    card,
    onDelete,
    onSetDefault,
    isDeleting,
    isSettingDefault,
}: Props): JSX.Element {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <View
            className={`overflow-hidden rounded-[18px] bg-white shadow-sm ${
                card.is_default ? "border-2 border-[#3B82F6]" : "border border-[#F3F4F6]"
            }`}
        >
            {/* Main row */}
            <View className="flex-row items-center gap-3 px-4 py-4">
                {/* Brand chip */}
                <View className="h-9 w-14 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
                    <Text className="text-[10px] font-bold uppercase tracking-wide text-[#374151]">
                        {card.brand.slice(0, 4)}
                    </Text>
                </View>

                {/* Details */}
                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <Text className="text-[15px] font-semibold text-[#111827]">
                            •••• {card.last4}
                        </Text>
                        {card.is_default && (
                            <View className="flex-row items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5">
                                <Ionicons name="star" size={9} color="#3B82F6" />
                                <Text className="text-[10px] font-bold text-[#3B82F6]">
                                    Default
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text className="mt-0.5 text-[12px] text-[#9CA3AF]">
                        Exp {card.exp_month.toString().padStart(2, "0")}/{card.exp_year}
                    </Text>
                </View>

                {/* Actions */}
                <View className="flex-row items-center gap-2">
                    {!card.is_default && (
                        <Pressable
                            onPress={() => onSetDefault(card.id)}
                            disabled={isSettingDefault}
                            accessibilityRole="button"
                            accessibilityLabel="Set as default card"
                            hitSlop={8}
                            className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 active:opacity-60 disabled:opacity-40"
                        >
                            {isSettingDefault ? (
                                <ActivityIndicator size="small" color="#6B7280" />
                            ) : (
                                <Text className="text-[11px] font-medium text-[#374151]">
                                    Set default
                                </Text>
                            )}
                        </Pressable>
                    )}

                    <Pressable
                        onPress={() => setShowConfirm(true)}
                        disabled={isDeleting}
                        accessibilityRole="button"
                        accessibilityLabel="Remove card"
                        hitSlop={8}
                        className="h-8 w-8 items-center justify-center rounded-full bg-[#FEF2F2] active:opacity-60 disabled:opacity-40"
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Inline delete confirmation */}
            {showConfirm && (
                <View className="border-t border-[#FEE2E2] bg-[#FFF5F5] px-4 py-3">
                    <Text className="mb-2.5 text-[13px] font-medium text-[#991B1B]">
                        Remove this card? This cannot be undone.
                    </Text>
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={() => setShowConfirm(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Keep card"
                            className="flex-1 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white py-2.5 active:opacity-70"
                        >
                            <Text className="text-[13px] font-semibold text-[#374151]">Keep</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                setShowConfirm(false);
                                onDelete(card.id);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Confirm remove card"
                            className="flex-1 items-center justify-center rounded-xl bg-red-500 py-2.5 active:opacity-70"
                        >
                            <Text className="text-[13px] font-semibold text-white">Remove</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}
