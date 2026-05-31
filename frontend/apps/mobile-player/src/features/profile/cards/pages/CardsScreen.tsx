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
                contentContainerClassName="px-4 pb-10 pt-4 gap-3"
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

                {/* Hero banner */}
                <View
                    className="overflow-hidden rounded-[20px] px-5 py-4"
                    style={{ backgroundColor: colors.hero }}
                >
                    <View className="flex-row items-center gap-3">
                        <View
                            className="h-10 w-10 items-center justify-center rounded-xl"
                            style={{ backgroundColor: colors.heroGlass }}
                        >
                            <Ionicons name="card" size={20} color={colors.heroForeground} />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="text-[15px] font-bold"
                                style={{ color: colors.heroForeground }}
                            >
                                Payment Methods
                            </Text>
                            <Text
                                className="mt-0.5 text-[12px]"
                                style={{ color: colors.heroMuted }}
                            >
                                Saved cards for bookings and membership payments
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Loading */}
                {isLoading && (
                    <View className="items-center justify-center py-12 gap-3">
                        <ActivityIndicator size="large" color={colors.cta} />
                        <Text className="text-[14px] font-medium text-muted-foreground">
                            Loading cards…
                        </Text>
                    </View>
                )}

                {/* Error */}
                {!isLoading && !!error && (
                    <View className="flex-row items-center gap-2 rounded-2xl border border-destructive bg-destructive/10 px-4 py-4">
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
                    <View className="items-center justify-center py-12 gap-3">
                        <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-secondary">
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
                            setDefaultMutation.isPending && setDefaultMutation.variables === card.id
                        }
                    />
                ))}

                {/* PCI notice at the bottom */}
                {sortedMethods.length > 0 && (
                    <View className="flex-row items-center justify-center gap-1.5 pt-2">
                        <Ionicons name="lock-closed" size={11} color={colors.placeholder} />
                        <Text className="text-[11px] text-muted-foreground">
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
