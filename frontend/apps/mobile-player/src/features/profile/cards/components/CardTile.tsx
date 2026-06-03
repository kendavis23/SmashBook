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
import { useThemeColors } from "../../../../theme";

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
    const colors = useThemeColors();
    const [showConfirm, setShowConfirm] = useState(false);
    const expiry = `${card.exp_month.toString().padStart(2, "0")}/${card.exp_year}`;
    const brand = card.brand.slice(0, 4).toUpperCase();

    return (
        <View
            style={{
                overflow: "hidden",
                borderRadius: 20,
                backgroundColor: colors.card,
                borderWidth: card.is_default ? 2 : 1,
                borderColor: card.is_default ? colors.cta : colors.border,
                shadowColor: card.is_default ? colors.cta : colors.shadow,
                shadowOffset: { width: 0, height: card.is_default ? 6 : 3 },
                shadowOpacity: card.is_default ? 0.12 : 0.06,
                shadowRadius: card.is_default ? 12 : 8,
                elevation: card.is_default ? 4 : 2,
            }}
        >
            {/* Main row */}
            <View className="flex-row items-center gap-3 px-4 py-3.5">
                {/* Brand chip */}
                <View
                    style={{
                        height: 50,
                        width: 68,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 14,
                        backgroundColor: card.is_default ? colors.ctaSurface : colors.muted,
                        borderWidth: 1,
                        borderColor: card.is_default ? colors.ctaBorder : colors.border,
                    }}
                >
                    <View
                        style={{
                            position: "absolute",
                            top: 8,
                            left: 10,
                            height: 7,
                            width: 16,
                            borderRadius: 4,
                            backgroundColor: card.is_default ? colors.cta : colors.border,
                        }}
                    />
                    <Text
                        style={{
                            fontSize: 11,
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: 0,
                            color: card.is_default ? colors.cta : colors.foreground,
                        }}
                    >
                        {brand}
                    </Text>
                </View>

                {/* Details */}
                <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                        <Text
                            numberOfLines={1}
                            style={{
                                fontSize: 16,
                                fontWeight: "700",
                                color: colors.foreground,
                                letterSpacing: 0,
                            }}
                        >
                            •••• {card.last4}
                        </Text>
                        {card.is_default && (
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 3,
                                    backgroundColor: colors.cta,
                                    borderRadius: 999,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                }}
                            >
                                <Ionicons name="star" size={9} color={colors.ctaForeground} />
                                <Text
                                    style={{
                                        fontSize: 10,
                                        fontWeight: "600",
                                        color: colors.ctaForeground,
                                    }}
                                >
                                    Default
                                </Text>
                            </View>
                        )}
                    </View>
                    <View className="mt-1.5 flex-row items-center gap-2">
                        <View
                            className="h-7 justify-center rounded-full px-3"
                            style={{ backgroundColor: colors.muted }}
                        >
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                    color: colors.mutedForeground,
                                }}
                            >
                                Exp {expiry}
                            </Text>
                        </View>
                        {card.is_default && (
                            <View
                                className="h-7 flex-row items-center gap-1.5 rounded-full px-3"
                                style={{ backgroundColor: colors.successSurface }}
                            >
                                <Ionicons
                                    name="checkmark-circle"
                                    size={12}
                                    color={colors.success}
                                />
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontWeight: "600",
                                        color: colors.success,
                                    }}
                                >
                                    Active
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Actions */}
                <View className="items-end gap-2">
                    {!card.is_default && (
                        <Pressable
                            onPress={() => onSetDefault(card.id)}
                            disabled={isSettingDefault}
                            accessibilityRole="button"
                            accessibilityLabel="Set as default card"
                            hitSlop={8}
                            style={{
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: colors.ctaBorder,
                                backgroundColor: colors.ctaSurface,
                                minWidth: 86,
                                alignItems: "center",
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                opacity: isSettingDefault ? 0.5 : 1,
                            }}
                        >
                            {isSettingDefault ? (
                                <ActivityIndicator size="small" color={colors.cta} />
                            ) : (
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontWeight: "700",
                                        color: colors.cta,
                                    }}
                                >
                                    Make default
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
                        style={{
                            height: 34,
                            width: 34,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 17,
                            backgroundColor: colors.destructiveSurface,
                            opacity: isDeleting ? 0.5 : 1,
                        }}
                    >
                        {isDeleting ? (
                            <ActivityIndicator size="small" color={colors.destructive} />
                        ) : (
                            <Ionicons name="trash-outline" size={15} color={colors.destructive} />
                        )}
                    </Pressable>
                </View>
            </View>

            {/* Inline delete confirmation */}
            {showConfirm && (
                <View className="border-t border-destructive bg-destructive/10 px-4 py-3.5">
                    <Text className="mb-2.5 text-[13px] font-medium text-destructive">
                        Remove this card? This cannot be undone.
                    </Text>
                    <View className="flex-row gap-2">
                        <Pressable
                            onPress={() => setShowConfirm(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Keep card"
                            className="flex-1 items-center justify-center rounded-xl border border-border bg-card py-2.5 active:opacity-70"
                        >
                            <Text className="text-[13px] font-semibold text-foreground">Keep</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                setShowConfirm(false);
                                onDelete(card.id);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Confirm remove card"
                            className="flex-1 items-center justify-center rounded-xl bg-destructive/100 py-2.5 active:opacity-70"
                        >
                            <Text className="text-[13px] font-semibold text-cta-foreground">
                                Remove
                            </Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}
