import { type JSX, useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useMyMatchHistory } from "@repo/player-domain";
import { MyGamesView } from "./MyGamesView";

export function MyGamesScreen(): JSX.Element {
    const { data, isLoading, error, refetch } = useMyMatchHistory();

    const handleRefresh = useCallback(() => {
        void refetch();
    }, [refetch]);

    return (
        <SafeAreaView className="flex-1 bg-[#F2F3F7]">
            <StatusBar style="dark" />

            {/* Header */}
            <View className="flex-row items-center justify-between bg-[#F2F3F7] px-5 pb-2 pt-1 android:pt-3.5">
                {/* Left: title block */}
                <View>
                    <Text className="text-[22px] font-bold text-[#111827]">My Games</Text>
                    <Text className="text-[12px] text-[#9CA3AF]">Your full match history</Text>
                </View>

                {/* Refresh */}
                <Pressable
                    onPress={handleRefresh}
                    disabled={isLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh match history"
                    hitSlop={12}
                    className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-50 disabled:opacity-40"
                >
                    <Ionicons name="refresh-outline" size={20} color="#111827" />
                </Pressable>
            </View>

            <MyGamesView
                games={data ?? []}
                isLoading={isLoading}
                error={error}
                onRefresh={handleRefresh}
            />
        </SafeAreaView>
    );
}
