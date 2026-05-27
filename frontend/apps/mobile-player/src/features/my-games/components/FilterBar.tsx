import { type JSX } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { FILTER_TABS } from "../constants/myGamesConstants";
import type { FilterTab } from "../types";

type Props = {
    active: FilterTab;
    counts: Record<FilterTab, number>;
    onChange: (tab: FilterTab) => void;
};

export function FilterBar({ active, counts, onChange }: Props): JSX.Element {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="flex-row gap-2 px-5 py-1"
        >
            {FILTER_TABS.map((tab) => {
                const isActive = active === tab.id;
                const count = counts[tab.id];

                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onChange(tab.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Filter by ${tab.label}`}
                        accessibilityState={{ selected: isActive }}
                        className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2 active:opacity-70 ${
                            isActive ? "border-[#2563EB] bg-[#2563EB]" : "border-[#E5E7EB] bg-white"
                        }`}
                    >
                        <Text
                            className={`text-[13px] font-semibold ${
                                isActive ? "text-white" : "text-[#374151]"
                            }`}
                        >
                            {tab.label}
                        </Text>
                        {count > 0 && (
                            <Text
                                className={`text-[11px] font-bold ${
                                    isActive ? "text-white/80" : "text-[#9CA3AF]"
                                }`}
                            >
                                {count}
                            </Text>
                        )}
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}
