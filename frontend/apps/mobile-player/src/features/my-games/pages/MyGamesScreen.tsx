import { type JSX, useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useMyMatchHistory } from "@repo/player-domain";
import { MyGamesView } from "./MyGamesView";
import { useThemeColors } from "../../../theme";

export function MyGamesScreen(): JSX.Element {
    const colors = useThemeColors();
    const { data, isLoading, error, refetch } = useMyMatchHistory();

    const handleRefresh = useCallback(() => {
        void refetch();
    }, [refetch]);

    const totalGames = data?.length ?? 0;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.hero }} edges={["top"]}>
            <StatusBar style="light" />

            {/* Hero header — fixed, does not scroll */}
            <View
                style={{
                    backgroundColor: colors.hero,
                    paddingHorizontal: 20,
                    paddingTop: 8,
                    paddingBottom: 28,
                }}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                fontSize: 13,
                                color: colors.heroMuted,
                                fontWeight: "500",
                                letterSpacing: 0.3,
                            }}
                        >
                            Your history
                        </Text>
                        <Text
                            style={{
                                fontSize: 26,
                                fontWeight: "700",
                                color: colors.heroForeground,
                                marginTop: 2,
                                letterSpacing: -0.3,
                            }}
                        >
                            My Games
                        </Text>
                        <Text
                            style={{
                                fontSize: 13,
                                color: colors.heroMuted,
                                marginTop: 4,
                                fontWeight: "400",
                            }}
                        >
                            {totalGames > 0
                                ? `${totalGames} game${totalGames !== 1 ? "s" : ""} in your history`
                                : "Your full match history"}
                        </Text>
                    </View>

                    {/* Refresh */}
                    <Pressable
                        onPress={handleRefresh}
                        disabled={isLoading}
                        accessibilityRole="button"
                        accessibilityLabel="Refresh match history"
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
                        }}
                    >
                        <Ionicons name="refresh-outline" size={18} color={colors.heroForeground} />
                    </Pressable>
                </View>
            </View>

            {/* Content card — lifts over hero */}
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.contentSurface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    marginTop: -16,
                    overflow: "hidden",
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    elevation: 6,
                }}
            >
                <MyGamesView
                    games={data ?? []}
                    isLoading={isLoading}
                    error={error}
                    onRefresh={handleRefresh}
                />
            </View>
        </SafeAreaView>
    );
}
