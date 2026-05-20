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
            className="absolute left-5 right-5"
            style={{
                bottom: bottomOffset,
            }}
            pointerEvents="box-none"
        >
            <View className="flex-row items-center rounded-[36px] bg-white px-3 py-2.5 shadow-xl">
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
                            className="flex-1 items-center justify-center gap-[5px]"
                        >
                            {/* Icon circle */}
                            <View
                                className={`h-12 w-12 items-center justify-center rounded-full ${
                                    isFocused ? "bg-[#F0F0F0]" : "bg-transparent"
                                }`}
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
                                className={`text-[11px] tracking-[0.2px] ${
                                    isFocused
                                        ? "font-bold text-[#2563EB]"
                                        : "font-medium text-[#6B7280]"
                                }`}
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
