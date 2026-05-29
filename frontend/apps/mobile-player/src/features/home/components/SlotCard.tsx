import type { JSX } from "react";
import { Pressable, Text, View } from "react-native";
import type { ClubAvailabilitySlot } from "../types";
import { formatPlainTime } from "../utils";

type Props = {
    slot: ClubAvailabilitySlot;
    isSelected: boolean;
    onPress: () => void;
};

export function SlotCard({ slot, isSelected, onPress }: Props): JSX.Element {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Time slot ${formatPlainTime(slot.start_time)} to ${formatPlainTime(slot.end_time)}`}
            accessibilityState={{ selected: isSelected }}
            className="mr-2 active:opacity-75"
        >
            <View
                style={{
                    borderWidth: isSelected ? 2 : 1.5,
                    borderColor: isSelected ? "#2563EB" : "#E5E7EB",
                    backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
                    borderRadius: 16,
                    width: 104,
                    height: 88,
                    paddingHorizontal: 12,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 15,
                        fontWeight: "800",
                        color: isSelected ? "#2563EB" : "#111827",
                    }}
                >
                    {formatPlainTime(slot.start_time)}
                </Text>
                <Text
                    numberOfLines={1}
                    style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isSelected ? "#3B82F6" : "#9CA3AF",
                        marginTop: 3,
                    }}
                >
                    {formatPlainTime(slot.end_time)}
                </Text>
            </View>
        </Pressable>
    );
}
