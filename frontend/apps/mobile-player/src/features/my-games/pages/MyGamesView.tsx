import { type JSX } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PlayerBookingItem } from "../types";
import { GameCard } from "../components/GameCard";

type Props = {
    games: PlayerBookingItem[];
    isLoading: boolean;
    error: Error | null;
    onRefresh: () => void;
};

export function MyGamesView({ games, isLoading, error, onRefresh }: Props): JSX.Element {
    /* ─── Loading state ─── */
    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center gap-3 bg-[#F1F5F9]">
                <View className="h-14 w-14 items-center justify-center rounded-[20px] bg-white shadow-sm">
                    <ActivityIndicator size="small" color="#2563EB" />
                </View>
                <Text className="text-[14px] font-medium text-[#9CA3AF]">
                    Loading match history…
                </Text>
            </View>
        );
    }

    /* ─── Error state ─── */
    if (error) {
        return (
            <View className="flex-1 items-center justify-center gap-4 bg-[#F1F5F9] px-8">
                <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-red-50">
                    <Ionicons name="alert-circle-outline" size={30} color="#EF4444" />
                </View>
                <Text className="text-center text-[17px] font-bold text-[#111827]">
                    Failed to load games
                </Text>
                <Text className="text-center text-[13px] leading-5 text-[#9CA3AF]">
                    {error.message ?? "Something went wrong. Please try again."}
                </Text>
                <Pressable
                    onPress={onRefresh}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading games"
                    className="mt-1 flex-row items-center gap-2 rounded-[14px] bg-[#2563EB] px-6 py-3.5 active:opacity-75"
                >
                    <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                    <Text className="text-[14px] font-semibold text-white">Retry</Text>
                </Pressable>
            </View>
        );
    }

    /* ─── Empty (no games at all) ─── */
    if (games.length === 0) {
        return (
            <View className="flex-1 items-center justify-center gap-4 bg-[#F1F5F9] px-8">
                <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-[#EFF6FF]">
                    <Ionicons name="tennisball-outline" size={36} color="#2563EB" />
                </View>
                <Text className="text-center text-[19px] font-bold text-[#111827]">
                    No games yet
                </Text>
                <Text className="text-center text-[14px] leading-5 text-[#9CA3AF]">
                    Once you book and play a session, your full match history will appear here.
                </Text>
            </View>
        );
    }

    /* ─── Main list ─── */
    return (
        <FlatList
            data={games}
            keyExtractor={(item) => item.booking_id}
            contentContainerClassName="pb-[120px] gap-3 pt-4"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
                <View className="px-5">
                    <GameCard game={item} />
                </View>
            )}
        />
    );
}
