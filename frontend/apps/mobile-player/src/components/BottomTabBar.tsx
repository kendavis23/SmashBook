import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useThemeColors } from "../theme";

type TabConfig = {
    name: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconFocused: keyof typeof Ionicons.glyphMap;
};

const TABS: TabConfig[] = [
    { name: "home", label: "Home", icon: "home-outline", iconFocused: "home" },
    { name: "book", label: "Book", icon: "calendar-outline", iconFocused: "calendar" },
    { name: "my-games", label: "My Games", icon: "tennisball-outline", iconFocused: "tennisball" },
    { name: "profile", label: "Profile", icon: "person-outline", iconFocused: "person" },
];

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const colors = useThemeColors();

    return (
        <View
            style={{
                backgroundColor: colors.tabBar,
                // Hairline top separator
                borderTopWidth: Platform.OS === "ios" ? 0.5 : 0.6,
                borderTopColor: colors.tabBarBorder,
                // Soft upward shadow (iOS)
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                // Android elevation
                elevation: 12,
                flexDirection: "row",
                alignItems: "stretch",
                paddingTop: 6,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                paddingHorizontal: 6,
            }}
        >
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const tab = TABS.find((t) => t.name === route.name);
                if (!tab) return null;

                const options = descriptors[route.key]?.options;

                const onPress = () => {
                    const event = navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                const onLongPress = () => {
                    navigation.emit({ type: "tabLongPress", target: route.key });
                };

                return (
                    <Pressable
                        key={route.key}
                        onPress={onPress}
                        onLongPress={onLongPress}
                        accessibilityRole="tab"
                        accessibilityLabel={options?.tabBarAccessibilityLabel ?? tab.label}
                        accessibilityState={{ selected: isFocused }}
                        android_ripple={{ color: colors.ripple, borderless: true }}
                        style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 4,
                        }}
                    >
                        {/* Icon */}
                        <Ionicons
                            name={isFocused ? tab.iconFocused : tab.icon}
                            size={24}
                            color={isFocused ? colors.tabActive : colors.tabInactive}
                            accessibilityElementsHidden
                        />

                        {/* Label */}
                        <Text
                            style={{
                                marginTop: 3,
                                fontSize: 11,
                                fontWeight: isFocused ? "700" : "500",
                                color: isFocused ? colors.tabActiveLabel : colors.tabInactive,
                                letterSpacing: 0.1,
                            }}
                            numberOfLines={1}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
