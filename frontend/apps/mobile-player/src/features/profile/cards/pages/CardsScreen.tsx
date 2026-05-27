import { type JSX, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
    useListPaymentMethods,
    useDeletePaymentMethod,
    useSetDefaultPaymentMethod,
} from "@repo/player-domain";
import { CardTile } from "../components/CardTile";
import { AddCardSheet } from "../components/AddCardSheet";

export function CardsScreen(): JSX.Element {
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
                    Cards
                </Text>

                {/* Add card button */}
                <Pressable
                    onPress={() => {
                        setSuccessMessage(null);
                        setShowAddSheet(true);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Add new card"
                    className="h-9 flex-row items-center gap-1.5 rounded-full bg-[#3B82F6] px-3.5 active:opacity-75"
                >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text className="text-[13px] font-semibold text-white">Add</Text>
                </Pressable>
            </View>

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
                        className="flex-row items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3"
                    >
                        <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                        <Text className="flex-1 text-[13px] font-medium text-green-700">
                            {successMessage}
                        </Text>
                        <Ionicons name="close" size={14} color="#86EFAC" />
                    </Pressable>
                )}

                {/* Hero banner */}
                <View className="overflow-hidden rounded-[20px] bg-[#1D2B4F] px-5 py-4">
                    <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                            <Ionicons name="card" size={20} color="#93C5FD" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-[15px] font-bold text-white">
                                Payment Methods
                            </Text>
                            <Text className="mt-0.5 text-[12px] text-white/55">
                                Saved cards for bookings and membership payments
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Loading */}
                {isLoading && (
                    <View className="items-center justify-center py-12 gap-3">
                        <ActivityIndicator size="large" color="#3B82F6" />
                        <Text className="text-[14px] font-medium text-[#9CA3AF]">
                            Loading cards…
                        </Text>
                    </View>
                )}

                {/* Error */}
                {!isLoading && !!error && (
                    <View className="flex-row items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
                        <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                        <Text className="flex-1 text-[14px] font-medium text-red-600">
                            Failed to load payment methods.
                        </Text>
                    </View>
                )}

                {/* Empty */}
                {!isLoading && !error && sortedMethods.length === 0 && (
                    <View className="items-center justify-center py-12 gap-3">
                        <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-[#EFF6FF]">
                            <Ionicons name="card-outline" size={30} color="#3B82F6" />
                        </View>
                        <Text className="text-[17px] font-bold text-[#111827]">No cards saved</Text>
                        <Text className="text-center text-[13px] leading-5 text-[#9CA3AF]">
                            Add a card to pay for bookings and membership plans.
                        </Text>
                        <Pressable
                            onPress={() => setShowAddSheet(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Add your first card"
                            className="mt-1 flex-row items-center gap-2 rounded-xl bg-[#3B82F6] px-6 py-3.5 active:opacity-80"
                        >
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                            <Text className="text-[14px] font-semibold text-white">
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
                        <Ionicons name="lock-closed" size={11} color="#D1D5DB" />
                        <Text className="text-[11px] text-[#D1D5DB]">
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
        </SafeAreaView>
    );
}
