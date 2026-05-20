import { Text, View } from "react-native";

type Props = {
    label: string;
    value: string;
};

export function ReadOnlyField({ label, value }: Props) {
    return (
        <View className="gap-1">
            <Text className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#9CA3AF]">
                {label}
            </Text>
            <Text className="text-[15px] font-normal text-[#6B7280]">{value}</Text>
        </View>
    );
}
