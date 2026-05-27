import { Text, View } from "react-native";
import type { ReactNode, JSX } from "react";

export function StatRow({
    label,
    value,
}: {
    label: string;
    value: string | number | null;
}): JSX.Element {
    return (
        <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-sm text-muted-foreground">{label}</Text>
            <Text className="text-sm font-semibold text-foreground">{value ?? "—"}</Text>
        </View>
    );
}

export function StatDivider(): JSX.Element {
    return <View className="border-b border-border mx-4" />;
}

export function SectionCard({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}): JSX.Element {
    return (
        <View className="rounded-2xl bg-background overflow-hidden shadow-sm">
            <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-muted">
                    {icon}
                </View>
                <Text className="text-sm font-semibold text-foreground">{title}</Text>
            </View>
            {children}
        </View>
    );
}
