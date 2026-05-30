import { useAuth } from "@repo/auth";
import { Redirect, Tabs, type Href } from "expo-router";
import { BottomTabBar } from "../../src/components/BottomTabBar";

export default function PlayerLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Redirect href={"/(auth)/login" as Href} />;
    }

    return (
        <Tabs
            tabBar={(props) => <BottomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: { display: "none" },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{ title: "Home", tabBarAccessibilityLabel: "Home" }}
            />
            <Tabs.Screen
                name="book"
                options={{ title: "Book", tabBarAccessibilityLabel: "Book" }}
            />
            <Tabs.Screen
                name="my-games"
                options={{ title: "My Games", tabBarAccessibilityLabel: "My Games" }}
            />
            <Tabs.Screen
                name="profile"
                options={{ title: "Profile", tabBarAccessibilityLabel: "Profile" }}
            />
        </Tabs>
    );
}
