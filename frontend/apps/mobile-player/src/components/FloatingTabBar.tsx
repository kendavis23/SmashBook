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

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets();
    const bottomOffset = Platform.OS === "ios" ? insets.bottom + 8 : 16;

    return (
        <View
            style={{
                position: "absolute",
                bottom: bottomOffset,
                left: 20,
                right: 20,
            }}
            pointerEvents="box-none"
        >
            <View
                style={{
                    flexDirection: "row",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 36,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    alignItems: "center",
                    // iOS shadow
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    // Android shadow
                    elevation: 12,
                }}
            >
                {state.routes.map((route, index) => {
                    const isFocused = state.index === index;
                    const tab = TABS.find((t) => t.name === route.name);
                    if (!tab) return null;

                    const { options } = descriptors[route.key];

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
                            accessibilityLabel={options.tabBarAccessibilityLabel ?? tab.label}
                            accessibilityState={{ selected: isFocused }}
                            style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                            }}
                        >
                            {/* Icon circle */}
                            <View
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: isFocused ? "#F0F0F0" : "transparent",
                                }}
                            >
                                <Ionicons
                                    name={isFocused ? tab.iconFocused : tab.icon}
                                    size={24}
                                    color={isFocused ? "#2563EB" : "#1A1A2E"}
                                    accessibilityElementsHidden
                                />
                            </View>

                            {/* Label */}
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: isFocused ? "700" : "500",
                                    color: isFocused ? "#2563EB" : "#6B7280",
                                    letterSpacing: 0.2,
                                }}
                                numberOfLines={1}
                            >
                                {tab.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}
