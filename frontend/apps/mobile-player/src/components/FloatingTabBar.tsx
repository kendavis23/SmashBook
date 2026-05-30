import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

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

const BLUE = "#2563EB";
const INACTIVE_COLOR = "#9CA3AF";
const ACTIVE_LABEL = "#111827";

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                backgroundColor: "#FFFFFF",
                // Top border separator
                borderTopWidth: 0.5,
                borderTopColor: "rgba(0,0,0,0.08)",
                // iOS shadow upward
                shadowColor: "#000000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                // Android elevation
                elevation: 12,
                flexDirection: "row",
                alignItems: "flex-start",
                paddingTop: 10,
                paddingBottom: Platform.OS === "ios" ? insets.bottom : 12,
                paddingHorizontal: 4,
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
                        style={{ flex: 1, alignItems: "center" }}
                    >
                        {/* Active dot indicator at the top */}
                        <View
                            style={{
                                width: 20,
                                height: 3,
                                borderRadius: 2,
                                backgroundColor: isFocused ? BLUE : "transparent",
                                marginBottom: 6,
                            }}
                        />

                        {/* Icon */}
                        <Ionicons
                            name={isFocused ? tab.iconFocused : tab.icon}
                            size={24}
                            color={isFocused ? BLUE : INACTIVE_COLOR}
                            accessibilityElementsHidden
                        />

                        {/* Label */}
                        <Text
                            style={{
                                marginTop: 3,
                                fontSize: 10,
                                fontWeight: isFocused ? "700" : "400",
                                color: isFocused ? ACTIVE_LABEL : INACTIVE_COLOR,
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
