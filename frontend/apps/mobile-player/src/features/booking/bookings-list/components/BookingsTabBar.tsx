import { type JSX } from "react";
import { Pressable, Text, View } from "react-native";
import type { BookingTab } from "../../types";
import { BOOKING_TABS } from "../../types";
import { useThemeColors } from "../../../../theme";

type Props = {
    activeTab: BookingTab;
    onTabChange: (tab: BookingTab) => void;
};

export function BookingsTabBar({ activeTab, onTabChange }: Props): JSX.Element {
    const colors = useThemeColors();
    return (
        <View
            style={{
                flexDirection: "row",
                gap: 4,
                borderRadius: 16,
                backgroundColor: colors.accent,
                padding: 4,
            }}
        >
            {BOOKING_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onTabChange(tab.id)}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                        accessibilityState={{ selected: isActive }}
                        style={{
                            flex: 1,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            borderRadius: 12,
                            paddingVertical: 10,
                            backgroundColor: isActive ? colors.card : "transparent",
                            shadowColor: colors.shadow,
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: isActive ? 0.06 : 0,
                            shadowRadius: 4,
                            elevation: isActive ? 2 : 0,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: isActive ? "600" : "500",
                                color: isActive ? colors.foreground : colors.mutedForeground,
                            }}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
