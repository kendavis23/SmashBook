import { type JSX, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetWallet } from "@repo/player-domain";
import { formatCurrency } from "../../../../lib";
import { TransactionTile } from "../components/TransactionTile";
import { TopUpSheet } from "../components/TopUpSheet";

const PAGE_SIZE = 8;

function formatBalance(amount: number | string | null | undefined): string {
    if (amount == null || amount === "") return "£0.00";
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!Number.isFinite(n)) return "£0.00";
    const result = formatCurrency(n);
    return result === "—" ? "£0.00" : result;
}

export function WalletScreen(): JSX.Element {
    const router = useRouter();
    const { data: wallet, isLoading, error, refetch } = useGetWallet();

    const [showTopUp, setShowTopUp] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [txPage, setTxPage] = useState(0);

    const handleRefresh = useCallback(() => {
        void refetch();
    }, [refetch]);

    const handleTopUpSuccess = useCallback(() => {
        setShowTopUp(false);
        setSuccessMessage("Wallet topped up successfully.");
        setTxPage(0);
        void refetch();
    }, [refetch]);

    const transactions = wallet?.transactions ?? [];
    const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
    const pageTxs = transactions.slice(txPage * PAGE_SIZE, (txPage + 1) * PAGE_SIZE);

    return (
        <SafeAreaView className="flex-1 bg-[#F2F3F7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between bg-[#F2F3F7] px-5 pb-2.5 pt-1 android:pt-3.5">
                <Pressable
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    hitSlop={12}
                    className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-50"
                >
                    <Ionicons name="chevron-back" size={28} color="#111827" />
                </Pressable>

                <Text className="absolute left-[76px] right-[76px] text-center text-[16px] font-semibold text-[#111827]">
                    Wallet
                </Text>

                {/* Refresh button */}
                <Pressable
                    onPress={handleRefresh}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh wallet"
                    hitSlop={12}
                    className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-50 disabled:opacity-40"
                >
                    <Ionicons name="refresh-outline" size={20} color="#111827" />
                </Pressable>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerClassName="px-4 pb-10 pt-4 gap-4"
                showsVerticalScrollIndicator={false}
            >
                {/* Success toast */}
                {!!successMessage && (
                    <Pressable
                        onPress={() => setSuccessMessage(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss success message"
                        className="flex-row items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3"
                    >
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                        <Text className="flex-1 text-[13px] font-medium text-green-700">
                            {successMessage}
                        </Text>
                        <Ionicons name="close" size={14} color="#86EFAC" />
                    </Pressable>
                )}

                {/* Balance card */}
                <View className="overflow-hidden rounded-[24px] bg-[#1D2B4F]">
                    {/* Top section */}
                    <View className="px-5 pt-5 pb-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2.5">
                                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                                    <Ionicons name="wallet" size={20} color="#6EE7B7" />
                                </View>
                                <View>
                                    <Text className="text-[11px] font-bold uppercase tracking-[0.6px] text-white/50">
                                        Wallet balance
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Balance */}
                        {isLoading ? (
                            <View className="mt-5 flex-row items-center gap-2">
                                <ActivityIndicator size="small" color="#6EE7B7" />
                                <Text className="text-[14px] text-white/60">Loading…</Text>
                            </View>
                        ) : error ? (
                            <Text className="mt-5 text-[15px] font-semibold text-red-400">
                                Failed to load wallet.
                            </Text>
                        ) : (
                            <Text className="mt-5 text-[42px] font-bold leading-none tracking-tight text-white">
                                {formatBalance(wallet?.balance ?? 0)}
                            </Text>
                        )}

                        <Text className="mt-2 text-[13px] text-white/45">
                            Available for bookings and instant checkout
                        </Text>
                    </View>

                    {/* Divider */}
                    <View className="mx-5 h-px bg-white/10" />

                    {/* Top-up button row */}
                    <View className="flex-row items-center justify-between px-5 py-4">
                        {wallet && (
                            <Text className="text-[12px] text-white/40">
                                Currency: {wallet.currency.toUpperCase()}
                            </Text>
                        )}
                        <Pressable
                            onPress={() => {
                                setSuccessMessage(null);
                                setShowTopUp(true);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Top up wallet"
                            disabled={isLoading}
                            className="flex-row items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2.5 active:opacity-75 disabled:opacity-40"
                        >
                            <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
                            <Text className="text-[14px] font-semibold text-white">Top up</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Auto top-up info badge (if enabled) */}
                {!isLoading && !error && wallet?.auto_topup_enabled && (
                    <View className="flex-row items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <Ionicons name="repeat-outline" size={16} color="#10B981" />
                        <Text className="flex-1 text-[12px] font-medium text-emerald-700">
                            Auto top-up is active — wallet tops up to{" "}
                            {formatBalance(wallet.auto_topup_amount ?? 0)} when balance falls below{" "}
                            {formatBalance(wallet.auto_topup_threshold ?? 0)}.
                        </Text>
                    </View>
                )}

                {/* Transaction history */}
                {!isLoading && !error && wallet && transactions.length > 0 && (
                    <View className="overflow-hidden rounded-[20px] bg-white shadow-sm">
                        {/* Section header */}
                        <View className="flex-row items-center justify-between border-b border-[#F3F4F6] px-4 py-3.5">
                            <View>
                                <Text className="text-[14px] font-bold text-[#111827]">
                                    Recent transactions
                                </Text>
                                <Text className="mt-0.5 text-[12px] text-[#9CA3AF]">
                                    Latest wallet activity
                                </Text>
                            </View>
                            {totalPages > 1 && (
                                <View className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1">
                                    <Text className="text-[11px] font-semibold text-[#6B7280]">
                                        {txPage + 1} / {totalPages}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Transaction rows */}
                        <View className="divide-y divide-[#F3F4F6]">
                            {pageTxs.map((tx, i) => (
                                <View
                                    key={tx.id}
                                    className={
                                        i < pageTxs.length - 1 ? "border-b border-[#F3F4F6]" : ""
                                    }
                                >
                                    <TransactionTile transaction={tx} />
                                </View>
                            ))}
                        </View>

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                            <View className="flex-row items-center justify-end gap-2 border-t border-[#F3F4F6] px-4 py-3">
                                <Pressable
                                    onPress={() => setTxPage((p) => p - 1)}
                                    disabled={txPage === 0}
                                    accessibilityRole="button"
                                    accessibilityLabel="Previous page"
                                    className="h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] active:opacity-70 disabled:opacity-40"
                                >
                                    <Ionicons name="chevron-back" size={16} color="#374151" />
                                </Pressable>
                                <Pressable
                                    onPress={() => setTxPage((p) => p + 1)}
                                    disabled={txPage === totalPages - 1}
                                    accessibilityRole="button"
                                    accessibilityLabel="Next page"
                                    className="h-9 w-9 items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] active:opacity-70 disabled:opacity-40"
                                >
                                    <Ionicons name="chevron-forward" size={16} color="#374151" />
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                {/* Empty transactions state */}
                {!isLoading && !error && wallet && transactions.length === 0 && (
                    <View className="items-center justify-center rounded-[20px] bg-white px-6 py-12 shadow-sm gap-3">
                        <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-[#F0FDF4]">
                            <Ionicons name="receipt-outline" size={28} color="#10B981" />
                        </View>
                        <Text className="text-[17px] font-bold text-[#111827]">
                            No transactions yet
                        </Text>
                        <Text className="text-center text-[13px] leading-5 text-[#9CA3AF]">
                            Top up your wallet to start seeing activity here.
                        </Text>
                        <Pressable
                            onPress={() => setShowTopUp(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Top up wallet"
                            className="mt-1 flex-row items-center gap-2 rounded-xl bg-[#10B981] px-6 py-3.5 active:opacity-80"
                        >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                            <Text className="text-[14px] font-semibold text-white">
                                Top up wallet
                            </Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>

            {/* Top-Up Sheet */}
            <TopUpSheet
                visible={showTopUp}
                onClose={() => setShowTopUp(false)}
                onSuccess={handleTopUpSuccess}
            />
        </SafeAreaView>
    );
}
