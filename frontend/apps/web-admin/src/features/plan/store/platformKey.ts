import { create } from "zustand";

interface PlatformKeyState {
    platformKey: string;
    isSet: boolean;
    set: (key: string) => void;
    clear: () => void;
}

export const usePlatformKeyStore = create<PlatformKeyState>((setState) => ({
    platformKey: "",
    isSet: false,
    set: (key: string) => setState({ platformKey: key, isSet: true }),
    clear: () => setState({ platformKey: "", isSet: false }),
}));
