import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../theme";

type Props = {
    title: string;
    subtitle?: string;
    onBack: () => void;
    backLabel?: string;
    /** Optional right-aligned action rendered inside the hero header. */
    headerAction?: ReactNode;
    children: ReactNode;
};

/**
 * Standard shell for every profile sub-screen: a blue hero header (back button +
 * title, optional right action) bleeding into the status bar, and a slate
 * `contentSurface` body that lifts over the hero and fills to the bottom — the
 * same pattern HomeScreen / BookScreen use. Keeps all profile screens visually
 * consistent in both light and dark.
 */
export function ProfileScreenShell({
    title,
    subtitle,
    onBack,
    backLabel = "Go back",
    headerAction,
    children,
}: Props) {
    const colors = useThemeColors();

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
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <Pressable
                        onPress={onBack}
                        accessibilityRole="button"
                        accessibilityLabel={backLabel}
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
                        <Ionicons name="chevron-back" size={22} color={colors.heroForeground} />
                    </Pressable>

                    <View style={{ flex: 1, paddingHorizontal: 12 }}>
                        <Text
                            numberOfLines={1}
                            style={{
                                fontSize: 20,
                                fontWeight: "700",
                                color: colors.heroForeground,
                                letterSpacing: -0.3,
                            }}
                        >
                            {title}
                        </Text>
                        {!!subtitle && (
                            <Text
                                numberOfLines={1}
                                style={{ fontSize: 13, color: colors.heroMuted, marginTop: 2 }}
                            >
                                {subtitle}
                            </Text>
                        )}
                    </View>

                    {headerAction ?? <View style={{ width: 40, height: 40 }} />}
                </View>
            </View>

            {/* Content surface — lifts over hero, fills to the bottom */}
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.contentSurface,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    marginTop: -16,
                    overflow: "hidden",
                }}
            >
                {children}
            </View>
        </SafeAreaView>
    );
}
