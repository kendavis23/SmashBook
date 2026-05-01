import type { Config } from "tailwindcss";
import sharedConfig from "@repo/tailwind-config";

const config: Config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/components/**/*.{ts,tsx}"],
    presets: [sharedConfig as Config],
};

export default config;
