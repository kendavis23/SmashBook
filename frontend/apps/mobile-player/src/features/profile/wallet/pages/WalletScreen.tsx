import { type JSX, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetWallet } from "@repo/player-domain";
import { formatCurrency } from "../../../../lib";
import { ProfileScreenShell } from "../../components/ProfileScreenShell";
import { useThemeColors } from "../../../../theme";
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
    const colors = useThemeColors();
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

    const refreshAction = (
        <Pressable
            onPress={handleRefresh}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Refresh wallet"
            hitSlop={12}
            style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.heroGlass,
                borderWidth: 1,
                borderColor: colors.heroGlassBorder,
                alignItems: "center",
                justifyContent: "center",
                opacity: isLoading ? 0.6 : 1,
            }}
        >
            <Ionicons name="refresh-outline" size={18} color={colors.heroForeground} />
        </Pressable>
    );

    return (
        <ProfileScreenShell
            title="Wallet"
            onBack={() => router.back()}
            headerAction={refreshAction}
        >
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
                        className="flex-row items-center gap-2 rounded-2xl border border-success bg-success/10 px-4 py-3"
                    >
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text className="flex-1 text-[13px] font-medium text-success">
                            {successMessage}
                        </Text>
                        <Ionicons name="close" size={14} color={colors.success} />
                    </Pressable>
                )}

                {/* Balance card */}
                <View
                    className="overflow-hidden rounded-[24px]"
                    style={{
                        backgroundColor: colors.ctaSurface,
                        borderWidth: 1,
                        borderColor: colors.ctaBorder,
                        shadowColor: colors.cta,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.1,
                        shadowRadius: 18,
                        elevation: 3,
                    }}
                >
                    {/* Top section */}
                    <View className="px-5 pt-5 pb-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2.5">
                                <View
                                    className="h-10 w-10 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: colors.card }}
                                >
                                    <Ionicons name="wallet" size={20} color={colors.cta} />
                                </View>
                                <View>
                                    <Text
                                        className="text-[11px] font-bold uppercase tracking-[0.6px]"
                                        style={{ color: colors.mutedForeground }}
                                    >
                                        Wallet balance
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Balance */}
                        {isLoading ? (
                            <View className="mt-5 flex-row items-center gap-2">
                                <ActivityIndicator size="small" color={colors.cta} />
                                <Text
                                    className="text-[14px]"
                                    style={{ color: colors.mutedForeground }}
                                >
                                    Loading…
                                </Text>
                            </View>
                        ) : error ? (
                            <Text className="mt-5 text-[15px] font-semibold text-destructive">
                                Failed to load wallet.
                            </Text>
                        ) : (
                            <Text
                                className="mt-5 text-[42px] font-bold leading-none tracking-tight"
                                style={{ color: colors.foreground }}
                            >
                                {formatBalance(wallet?.balance ?? 0)}
                            </Text>
                        )}

                        <Text
                            className="mt-2 text-[13px]"
                            style={{ color: colors.mutedForeground }}
                        >
                            Available for bookings and instant checkout
                        </Text>
                    </View>

                    {/* Top-up button row */}
                    <View
                        className="mx-4 mb-4 mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
                        style={{
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.ctaBorder,
                        }}
                    >
                        {wallet && (
                            <Text className="text-[12px]" style={{ color: colors.mutedForeground }}>
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
                            className="flex-row items-center gap-2 rounded-xl bg-cta px-4 py-2.5 active:opacity-75 disabled:opacity-40"
                        >
                            <Ionicons
                                name="add-circle-outline"
                                size={16}
                                color={colors.ctaForeground}
                            />
                            <Text className="text-[14px] font-semibold text-cta-foreground">
                                Top up
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Auto top-up info badge (if enabled) */}
                {!isLoading && !error && wallet?.auto_topup_enabled && (
                    <View className="flex-row items-center gap-2.5 rounded-2xl border border-success bg-success/10 px-4 py-3">
                        <Ionicons name="repeat-outline" size={16} color={colors.success} />
                        <Text className="flex-1 text-[12px] font-medium text-success">
                            Auto top-up is active — wallet tops up to{" "}
                            {formatBalance(wallet.auto_topup_amount ?? 0)} when balance falls below{" "}
                            {formatBalance(wallet.auto_topup_threshold ?? 0)}.
                        </Text>
                    </View>
                )}

                {/* Transaction history */}
                {!isLoading && !error && wallet && transactions.length > 0 && (
                    <View className="overflow-hidden rounded-[20px] bg-card shadow-sm">
                        {/* Section header */}
                        <View className="flex-row items-center justify-between border-b border-border px-4 py-3.5">
                            <View>
                                <Text className="text-[14px] font-bold text-foreground">
                                    Recent transactions
                                </Text>
                                <Text className="mt-0.5 text-[12px] text-muted-foreground">
                                    Latest wallet activity
                                </Text>
                            </View>
                            {totalPages > 1 && (
                                <View className="rounded-full border border-border bg-muted px-2.5 py-1">
                                    <Text className="text-[11px] font-semibold text-muted-foreground">
                                        {txPage + 1} / {totalPages}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Transaction rows */}
                        <View className="divide-y divide-border">
                            {pageTxs.map((tx, i) => (
                                <View
                                    key={tx.id}
                                    className={
                                        i < pageTxs.length - 1 ? "border-b border-border" : ""
                                    }
                                >
                                    <TransactionTile transaction={tx} />
                                </View>
                            ))}
                        </View>

                        {/* Pagination controls */}
                        {totalPages > 1 && (
                            <View className="flex-row items-center justify-end gap-2 border-t border-border px-4 py-3">
                                <Pressable
                                    onPress={() => setTxPage((p) => p - 1)}
                                    disabled={txPage === 0}
                                    accessibilityRole="button"
                                    accessibilityLabel="Previous page"
                                    className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted active:opacity-70 disabled:opacity-40"
                                >
                                    <Ionicons
                                        name="chevron-back"
                                        size={16}
                                        color={colors.foreground}
                                    />
                                </Pressable>
                                <Pressable
                                    onPress={() => setTxPage((p) => p + 1)}
                                    disabled={txPage === totalPages - 1}
                                    accessibilityRole="button"
                                    accessibilityLabel="Next page"
                                    className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted active:opacity-70 disabled:opacity-40"
                                >
                                    <Ionicons
                                        name="chevron-forward"
                                        size={16}
                                        color={colors.foreground}
                                    />
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                {/* Empty transactions state */}
                {!isLoading && !error && wallet && transactions.length === 0 && (
                    <View className="items-center justify-center rounded-[20px] bg-card px-6 py-12 shadow-sm gap-3">
                        <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-success/10">
                            <Ionicons name="receipt-outline" size={28} color={colors.success} />
                        </View>
                        <Text className="text-[17px] font-bold text-foreground">
                            No transactions yet
                        </Text>
                        <Text className="text-center text-[13px] leading-5 text-muted-foreground">
                            Top up your wallet to start seeing activity here.
                        </Text>
                        <Pressable
                            onPress={() => setShowTopUp(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Top up wallet"
                            className="mt-1 flex-row items-center gap-2 rounded-xl bg-cta px-6 py-3.5 active:opacity-80"
                        >
                            <Ionicons name="add" size={16} color={colors.ctaForeground} />
                            <Text className="text-[14px] font-semibold text-cta-foreground">
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
        </ProfileScreenShell>
    );
}
