import { type JSX } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WalletTransaction } from "@repo/player-domain";
import { formatUTCDate, formatUTCTime, formatCurrency } from "../../../../lib";

type Props = {
    transaction: WalletTransaction;
};

function formatAmount(amount: number | string | null | undefined): string {
    if (amount == null || amount === "") return "£0.00";
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!Number.isFinite(n)) return "£0.00";
    const result = formatCurrency(Math.abs(n));
    return result === "—" ? "£0.00" : result;
}

function labelFromType(type: string): string {
    return type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

export function TransactionTile({ transaction: tx }: Props): JSX.Element {
    const isDebit = tx.transaction_type === "debit";

    return (
        <View className="flex-row items-center gap-3 px-4 py-3.5">
            {/* Icon */}
            <View
                className={`h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${
                    isDebit ? "bg-red-50" : "bg-emerald-50"
                }`}
            >
                <Ionicons
                    name={isDebit ? "arrow-up-outline" : "arrow-down-outline"}
                    size={16}
                    color={isDebit ? "#EF4444" : "#10B981"}
                />
            </View>

            {/* Description */}
            <View className="flex-1 min-w-0">
                <Text className="text-[14px] font-semibold text-[#111827]" numberOfLines={1}>
                    {labelFromType(tx.transaction_type)}
                </Text>
                <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
                    <Text className="text-[12px] text-[#9CA3AF]">
                        {formatUTCDate(tx.created_at)} · {formatUTCTime(tx.created_at)}
                    </Text>
                    {!!tx.reference && (
                        <Text className="text-[12px] text-[#9CA3AF]" numberOfLines={1}>
                            · {tx.reference}
                        </Text>
                    )}
                </View>
            </View>

            {/* Amount + balance after */}
            <View className="items-end shrink-0 ml-2">
                <Text
                    className={`text-[14px] font-bold ${
                        isDebit ? "text-red-500" : "text-emerald-500"
                    }`}
                >
                    {isDebit ? "−" : "+"}
                    {formatAmount(tx.amount)}
                </Text>
                <Text className="mt-0.5 text-[11px] text-[#9CA3AF]">
                    Bal: {formatAmount(tx.balance_after)}
                </Text>
            </View>
        </View>
    );
}
