import { type JSX, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
    useListPaymentMethods,
    useDeletePaymentMethod,
    useSetDefaultPaymentMethod,
} from "@repo/player-domain";
import { CardTile } from "../components/CardTile";
import { ProfileScreenShell } from "../../components/ProfileScreenShell";
import { useThemeColors } from "../../../../theme";
import { AddCardSheet } from "../components/AddCardSheet";

export function CardsScreen(): JSX.Element {
    const colors = useThemeColors();
    const router = useRouter();

    const { data: methods, isLoading, error, refetch } = useListPaymentMethods();
    const deleteMutation = useDeletePaymentMethod();
    const setDefaultMutation = useSetDefaultPaymentMethod();

    const [showAddSheet, setShowAddSheet] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const sortedMethods = methods
        ? [...methods].sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0))
        : [];

    const handleDelete = useCallback(
        (id: string) => {
            deleteMutation.mutate(id, {
                onSuccess: () => setSuccessMessage("Card removed successfully."),
            });
        },
        [deleteMutation]
    );

    const handleSetDefault = useCallback(
        (id: string) => {
            setDefaultMutation.mutate(id, {
                onSuccess: () => setSuccessMessage("Default payment method updated."),
            });
        },
        [setDefaultMutation]
    );

    const handleAddSuccess = useCallback(() => {
        setShowAddSheet(false);
        setSuccessMessage("Card saved successfully.");
        void refetch();
    }, [refetch]);

    const addAction = (
        <Pressable
            onPress={() => {
                setSuccessMessage(null);
                setShowAddSheet(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Add new card"
            hitSlop={12}
            style={{
                height: 40,
                paddingHorizontal: 14,
                borderRadius: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: colors.heroForeground,
            }}
        >
            <Ionicons name="add" size={16} color={colors.hero} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.hero }}>Add</Text>
        </Pressable>
    );

    return (
        <ProfileScreenShell title="Cards" onBack={() => router.back()} headerAction={addAction}>
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-4 pb-8 pt-4"
                showsVerticalScrollIndicator={false}
            >
                {/* Success toast */}
                {!!successMessage && (
                    <Pressable
                        onPress={() => setSuccessMessage(null)}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss success message"
                        className="mb-4 flex-row items-center gap-2 rounded-2xl border border-success bg-success/10 px-4 py-3"
                    >
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <Text className="flex-1 text-[13px] font-medium text-success">
                            {successMessage}
                        </Text>
                        <Ionicons name="close" size={14} color={colors.success} />
                    </Pressable>
                )}

                {/* Overview panel */}
                <View
                    className="mb-3 overflow-hidden rounded-[22px]"
                    style={{
                        backgroundColor: colors.card,
                        borderWidth: 1,
                        borderColor: colors.border,
                        shadowColor: colors.shadow,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.08,
                        shadowRadius: 18,
                        elevation: 3,
                    }}
                >
                    <View className="px-5 py-4">
                        <View className="flex-row items-center gap-3">
                            <View
                                className="h-11 w-11 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: colors.ctaSurface }}
                            >
                                <Ionicons name="wallet" size={22} color={colors.cta} />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-[16px] font-bold"
                                    style={{ color: colors.foreground }}
                                >
                                    Payment Methods
                                </Text>
                                <Text
                                    className="mt-0.5 text-[12px] leading-5"
                                    style={{ color: colors.mutedForeground }}
                                >
                                    Saved cards for bookings and memberships
                                </Text>
                            </View>
                        </View>
                        <View
                            className="mt-3 flex-row items-center justify-between rounded-2xl px-4 py-3"
                            style={{
                                backgroundColor: colors.muted,
                                borderWidth: 1,
                                borderColor: colors.border,
                            }}
                        >
                            <View>
                                <Text
                                    className="text-[10px] font-semibold uppercase"
                                    style={{ color: colors.mutedForeground }}
                                >
                                    Saved cards
                                </Text>
                                <Text
                                    className="mt-0.5 text-[22px] font-bold"
                                    style={{ color: colors.foreground }}
                                >
                                    {sortedMethods.length}
                                </Text>
                            </View>
                            <View className="items-end">
                                <Text
                                    className="text-[10px] font-semibold uppercase"
                                    style={{ color: colors.mutedForeground }}
                                >
                                    Default
                                </Text>
                                <View className="mt-1 flex-row items-center gap-1.5">
                                    <Ionicons
                                        name={
                                            sortedMethods.some((card) => card.is_default)
                                                ? "star"
                                                : "star-outline"
                                        }
                                        size={14}
                                        color={colors.cta}
                                    />
                                    <Text
                                        className="text-[13px] font-semibold"
                                        style={{ color: colors.foreground }}
                                    >
                                        {sortedMethods.some((card) => card.is_default)
                                            ? "Ready"
                                            : "None"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {!isLoading && !error && sortedMethods.length > 0 && (
                    <View className="mb-2.5 flex-row items-center justify-between px-1">
                        <View>
                            <Text
                                className="text-[12px] font-semibold uppercase"
                                style={{ color: colors.mutedForeground }}
                            >
                                Your cards
                            </Text>
                            <Text
                                className="mt-0.5 text-[12px]"
                                style={{ color: colors.mutedForeground }}
                            >
                                Manage defaults and saved payment details
                            </Text>
                        </View>
                        <View
                            className="h-7 w-7 items-center justify-center rounded-full"
                            style={{ backgroundColor: colors.ctaSurface }}
                        >
                            <Ionicons name="shield-checkmark" size={15} color={colors.cta} />
                        </View>
                    </View>
                )}

                {/* Loading */}
                {isLoading && (
                    <View className="items-center justify-center gap-3 rounded-[24px] border border-border bg-card py-12">
                        <ActivityIndicator size="large" color={colors.cta} />
                        <Text className="text-[14px] font-medium text-muted-foreground">
                            Loading cards…
                        </Text>
                    </View>
                )}

                {/* Error */}
                {!isLoading && !!error && (
                    <View className="flex-row items-center gap-2 rounded-[20px] border border-destructive bg-destructive/10 px-4 py-4">
                        <Ionicons
                            name="alert-circle-outline"
                            size={18}
                            color={colors.destructive}
                        />
                        <Text className="flex-1 text-[14px] font-medium text-destructive">
                            Failed to load payment methods.
                        </Text>
                    </View>
                )}

                {/* Empty */}
                {!isLoading && !error && sortedMethods.length === 0 && (
                    <View className="items-center justify-center gap-3 rounded-[24px] border border-border bg-card px-8 py-12">
                        <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-secondary">
                            <Ionicons name="card-outline" size={30} color={colors.cta} />
                        </View>
                        <Text className="text-[17px] font-bold text-foreground">
                            No cards saved
                        </Text>
                        <Text className="text-center text-[13px] leading-5 text-muted-foreground">
                            Add a card to pay for bookings and membership plans.
                        </Text>
                        <Pressable
                            onPress={() => setShowAddSheet(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Add your first card"
                            className="mt-1 flex-row items-center gap-2 rounded-xl bg-cta px-6 py-3.5 active:opacity-80"
                        >
                            <Ionicons name="add" size={16} color={colors.ctaForeground} />
                            <Text className="text-[14px] font-semibold text-cta-foreground">
                                Add your first card
                            </Text>
                        </Pressable>
                    </View>
                )}

                {/* Card list */}
                <View className="gap-3">
                    {sortedMethods.map((card) => (
                        <CardTile
                            key={card.id}
                            card={card}
                            onDelete={handleDelete}
                            onSetDefault={handleSetDefault}
                            isDeleting={
                                deleteMutation.isPending && deleteMutation.variables === card.id
                            }
                            isSettingDefault={
                                setDefaultMutation.isPending &&
                                setDefaultMutation.variables === card.id
                            }
                        />
                    ))}
                </View>

                {/* PCI notice at the bottom */}
                {sortedMethods.length > 0 && (
                    <View
                        className="mx-2 mt-5 flex-row items-center justify-center gap-2 rounded-full px-4 py-3"
                        style={{ backgroundColor: colors.muted }}
                    >
                        <Ionicons name="lock-closed" size={12} color={colors.placeholder} />
                        <Text className="text-[11px] font-medium text-muted-foreground">
                            PCI DSS compliant · Secured by Stripe
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Add Card Sheet */}
            <AddCardSheet
                visible={showAddSheet}
                onClose={() => setShowAddSheet(false)}
                onSuccess={handleAddSuccess}
            />
        </ProfileScreenShell>
    );
}
