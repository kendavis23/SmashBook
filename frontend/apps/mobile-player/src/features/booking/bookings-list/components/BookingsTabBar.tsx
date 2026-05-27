import { type JSX } from "react";
import { Pressable, Text, View } from "react-native";
import type { BookingTab } from "../../types";
import { BOOKING_TABS } from "../../types";

type Props = {
    activeTab: BookingTab;
    upcomingCount: number;
    onTabChange: (tab: BookingTab) => void;
};

export function BookingsTabBar({ activeTab, upcomingCount, onTabChange }: Props): JSX.Element {
    return (
        <View className="flex-row gap-1 rounded-[16px] bg-[#F3F4F6] p-1">
            {BOOKING_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onTabChange(tab.id)}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                        accessibilityState={{ selected: isActive }}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[12px] py-2.5 active:opacity-75"
                        style={{ backgroundColor: isActive ? "#FFFFFF" : "transparent" }}
                    >
                        <Text
                            style={{ color: isActive ? "#111827" : "#9CA3AF" }}
                            className="text-[13px] font-semibold"
                        >
                            {tab.label}
                        </Text>
                        {tab.id === "upcoming" && upcomingCount > 0 ? (
                            <View
                                style={{ backgroundColor: isActive ? "#2563EB" : "#9CA3AF" }}
                                className="h-5 min-w-[20px] items-center justify-center rounded-full px-1"
                            >
                                <Text className="text-[10px] font-bold text-white">
                                    {upcomingCount}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                );
            })}
        </View>
    );
}
