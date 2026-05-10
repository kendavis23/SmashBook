import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function HomePage() {
    return (
        <SafeAreaView className="flex-1 bg-background">
            <StatusBar style="dark" />
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-2xl font-semibold text-foreground">SmashBook</Text>
                <Text className="mt-2 text-center text-sm text-muted-foreground">
                    Player home is ready for the next mobile screen.
                </Text>
            </View>
        </SafeAreaView>
    );
}
