import { Redirect } from "expo-router";

// Redirect root to player tabs — auth guard handled in (player)/_layout.tsx
export default function Index() {
    return <Redirect href="/(player)/home" />;
}
