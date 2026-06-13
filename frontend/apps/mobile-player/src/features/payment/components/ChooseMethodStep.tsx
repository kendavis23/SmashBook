import { type JSX, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetWallet } from "@repo/player-domain";
import type { PaymentMethod } from "../types";
import { formatCurrency } from "../../../lib";
import { useThemeColors } from "../../../theme";

type MethodType = "wallet" | "card";

type Props = {
    methods: PaymentMethod[];
    amountDue: number;
    isPreparing: boolean;
    /** null card id ⇒ user chose "add new card" */
    onPayWithCard: (methodId: string | null) => void;
    onPayWithWallet: () => void;
};

function RadioDot({ active }: { active: boolean }): JSX.Element {
    const colors = useThemeColors();
    return (
        <View
            className="h-5 w-5 items-center justify-center rounded-full border-2"
            style={{
                borderColor: active ? colors.cta : colors.border,
                backgroundColor: active ? colors.cta : "transparent",
            }}
        >
            {active ? <Ionicons name="checkmark" size={11} color={colors.ctaForeground} /> : null}
        </View>
    );
}

/** Card row inside the expanded card list. */
function CardRow({
    method,
    selected,
    onPress,
}: {
    method: PaymentMethod;
    selected: boolean;
    onPress: () => void;
}): JSX.Element {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Pay with card ending ${method.last4}`}
            accessibilityState={{ selected }}
            className="flex-row items-center gap-3 border-t border-border/50 px-4 py-3.5 active:opacity-70"
        >
            <View className="h-8 w-12 items-center justify-center rounded-lg border border-border bg-muted">
                <Text className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                    {method.brand.slice(0, 4)}
                </Text>
            </View>
            <View className="flex-1">
                <Text className="text-[14px] font-medium text-foreground">•••• {method.last4}</Text>
                <Text className="mt-0.5 text-[12px] text-muted-foreground">
                    Exp {String(method.exp_month).padStart(2, "0")}/{method.exp_year}
                </Text>
            </View>
            {method.is_default ? (
                <View className="rounded-full bg-secondary px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-cta">Default</Text>
                </View>
            ) : null}
            <RadioDot active={selected} />
        </Pressable>
    );
}

export function ChooseMethodStep({
    methods,
    amountDue,
    isPreparing,
    onPayWithCard,
    onPayWithWallet,
}: Props): JSX.Element {
    const colors = useThemeColors();
    const defaultCard = methods.find((m) => m.is_default) ?? methods[0];

    const [method, setMethod] = useState<MethodType>("wallet");
    const [selectedCardId, setSelectedCardId] = useState<string | null>(defaultCard?.id ?? null);
    const [cardExpanded, setCardExpanded] = useState(false);

    const { data: wallet, isLoading: walletLoading } = useGetWallet();
    const walletBalance =
        typeof wallet?.balance === "string"
            ? Number.parseFloat(wallet.balance)
            : (wallet?.balance ?? 0);
    const hasEnoughBalance = walletBalance >= amountDue;

    // Fall back to card if wallet can't cover the amount.
    useEffect(() => {
        if (!walletLoading && !hasEnoughBalance && method === "wallet") {
            setMethod("card");
        }
    }, [walletLoading, hasEnoughBalance, method]);

    const selectedCard = methods.find((m) => m.id === selectedCardId);

    function handleConfirm() {
        if (method === "wallet") {
            onPayWithWallet();
        } else {
            onPayWithCard(selectedCardId);
        }
    }

    const walletDisabled = method === "wallet" && (!hasEnoughBalance || walletLoading);
    const confirmLabel =
        method === "wallet"
            ? `Pay ${formatCurrency(amountDue)} with Wallet`
            : selectedCard
              ? `Pay ${formatCurrency(amountDue)} with •• ${selectedCard.last4}`
              : "Continue to add card";

    return (
        <View className="gap-4">
            <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                How would you like to pay?
            </Text>

            {/* Wallet */}
            <Pressable
                onPress={() => setMethod("wallet")}
                accessibilityRole="button"
                accessibilityLabel="Pay with wallet"
                accessibilityState={{ selected: method === "wallet" }}
                className="rounded-[18px] border px-4 py-4 active:opacity-80"
                style={{
                    borderColor: method === "wallet" ? colors.cta : colors.border,
                    backgroundColor: method === "wallet" ? colors.ctaSurface : colors.card,
                }}
            >
                <View className="flex-row items-center gap-3">
                    <View
                        className="h-10 w-10 items-center justify-center rounded-[12px]"
                        style={{
                            backgroundColor: method === "wallet" ? colors.cta : colors.muted,
                        }}
                    >
                        <Ionicons
                            name="wallet-outline"
                            size={18}
                            color={
                                method === "wallet" ? colors.ctaForeground : colors.mutedForeground
                            }
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-foreground">
                            Pay with Wallet
                        </Text>
                        <Text className="text-[12px] text-muted-foreground">
                            Instant · No extra steps
                        </Text>
                    </View>
                    <RadioDot active={method === "wallet"} />
                </View>

                {method === "wallet" ? (
                    <View className="mt-3 flex-row items-center justify-between rounded-[12px] border border-border/60 bg-background px-3 py-2.5">
                        <Text className="text-[12px] text-muted-foreground">Available balance</Text>
                        {walletLoading ? (
                            <ActivityIndicator size="small" color={colors.placeholder} />
                        ) : (
                            <Text
                                className="text-[13px] font-semibold"
                                style={{ color: hasEnoughBalance ? colors.cta : colors.warning }}
                            >
                                {formatCurrency(walletBalance)}
                                {!hasEnoughBalance ? "  (insufficient)" : ""}
                            </Text>
                        )}
                    </View>
                ) : null}
            </Pressable>

            {/* Card */}
            <View
                className="overflow-hidden rounded-[18px] border"
                style={{
                    borderColor: method === "card" ? colors.cta : colors.border,
                    backgroundColor: colors.card,
                }}
            >
                <Pressable
                    onPress={() => {
                        setMethod("card");
                        setCardExpanded((v) => !v);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Pay with card"
                    accessibilityState={{ selected: method === "card" }}
                    className="flex-row items-center gap-3 px-4 py-4 active:opacity-80"
                >
                    <View
                        className="h-10 w-10 items-center justify-center rounded-[12px]"
                        style={{ backgroundColor: method === "card" ? colors.cta : colors.muted }}
                    >
                        <Ionicons
                            name="card-outline"
                            size={18}
                            color={
                                method === "card" ? colors.ctaForeground : colors.mutedForeground
                            }
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-foreground">
                            Pay with Card
                        </Text>
                        <Text className="text-[12px] text-muted-foreground">
                            {methods.length > 0
                                ? `${methods.length} saved · Debit, Credit`
                                : "Debit, Credit"}
                        </Text>
                    </View>
                    <RadioDot active={method === "card"} />
                </Pressable>

                {/* Card list — shown only when card method is selected */}
                {method === "card" ? (
                    <View>
                        {cardExpanded ? (
                            <>
                                {methods.map((card) => (
                                    <CardRow
                                        key={card.id}
                                        method={card}
                                        selected={selectedCardId === card.id}
                                        onPress={() => {
                                            setSelectedCardId(card.id);
                                            setCardExpanded(false);
                                        }}
                                    />
                                ))}
                                <Pressable
                                    onPress={() => {
                                        setSelectedCardId(null);
                                        setCardExpanded(false);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Add new card"
                                    accessibilityState={{ selected: selectedCardId === null }}
                                    className="flex-row items-center gap-3 border-t border-border/50 px-4 py-3.5 active:opacity-70"
                                >
                                    <View className="h-8 w-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/50">
                                        <Ionicons
                                            name="add"
                                            size={16}
                                            color={colors.mutedForeground}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-[14px] font-medium text-foreground">
                                            Add new card
                                        </Text>
                                        <Text className="text-[12px] text-muted-foreground">
                                            Securely saved for future use
                                        </Text>
                                    </View>
                                    <RadioDot active={selectedCardId === null} />
                                </Pressable>
                            </>
                        ) : (
                            <View className="flex-row items-center justify-between border-t border-border/50 px-4 py-3">
                                {selectedCard ? (
                                    <View className="flex-row items-center gap-2">
                                        <View className="h-7 w-10 items-center justify-center rounded-md border border-border bg-muted">
                                            <Text className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                                                {selectedCard.brand.slice(0, 4)}
                                            </Text>
                                        </View>
                                        <Text className="text-[13px] font-medium text-foreground">
                                            •••• {selectedCard.last4}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text className="text-[13px] text-muted-foreground">
                                        Add a new card
                                    </Text>
                                )}
                                <Pressable
                                    onPress={() => setCardExpanded(true)}
                                    accessibilityRole="button"
                                    accessibilityLabel="Change card"
                                    hitSlop={8}
                                >
                                    <Text className="text-[12px] font-semibold text-cta">
                                        {methods.length > 0 ? "Change" : "Use saved card"}
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                ) : null}
            </View>

            {/* Confirm */}
            <Pressable
                onPress={handleConfirm}
                disabled={isPreparing || walletDisabled}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
                className="mt-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-cta py-4 active:opacity-90 disabled:opacity-50"
            >
                {isPreparing ? (
                    <ActivityIndicator size="small" color={colors.ctaForeground} />
                ) : (
                    <Ionicons name="lock-closed" size={16} color={colors.ctaForeground} />
                )}
                <Text className="text-[15px] font-bold text-cta-foreground">
                    {isPreparing ? "Preparing…" : confirmLabel}
                </Text>
            </Pressable>

            <Text className="text-center text-[11px] text-muted-foreground">
                PCI DSS compliant · Secured by Stripe · 3D Secure may apply
            </Text>
        </View>
    );
}
