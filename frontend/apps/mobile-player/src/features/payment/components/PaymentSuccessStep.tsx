import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../../../lib";
import { useThemeColors } from "../../../theme";

type Props = {
    amount: number;
    currency: string;
    method: "card" | "wallet";
    onDone: () => void;
};

export function PaymentSuccessStep({ amount, currency, method, onDone }: Props): JSX.Element {
    const colors = useThemeColors();
    const isWallet = method === "wallet";

    return (
        <View className="items-center gap-6 py-8">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-success/10">
                <Ionicons name="checkmark-circle" size={56} color={colors.success} />
            </View>

            <View className="items-center gap-2">
                <Text className="text-[22px] font-bold text-foreground">Payment successful</Text>
                <Text className="text-center text-[14px] text-muted-foreground">
                    {formatCurrency(amount)} has been deducted from your{" "}
                    {isWallet ? "wallet" : "card"}.
                </Text>
            </View>

            <View className="w-full flex-row items-center justify-between rounded-[16px] border border-border/60 bg-muted/30 px-4 py-3.5">
                <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-card shadow-sm">
                        <Ionicons
                            name={isWallet ? "wallet-outline" : "card-outline"}
                            size={18}
                            color={colors.cta}
                        />
                    </View>
                    <View>
                        <Text className="text-[14px] font-semibold text-foreground">
                            Total paid
                        </Text>
                        <Text className="text-[11px] uppercase text-muted-foreground">
                            {currency}
                        </Text>
                    </View>
                </View>
                <Text className="text-[18px] font-bold text-foreground">
                    {formatCurrency(amount)}
                </Text>
            </View>

            <Pressable
                onPress={onDone}
                accessibilityRole="button"
                accessibilityLabel="Done"
                className="w-full items-center justify-center rounded-[16px] bg-cta py-4 active:opacity-90"
            >
                <Text className="text-[15px] font-bold text-cta-foreground">Done</Text>
            </Pressable>
        </View>
    );
}
