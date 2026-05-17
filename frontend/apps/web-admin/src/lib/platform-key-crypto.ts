const STORAGE_KEY = "smashbook_admin_pk";
const SALT = "smashbook_admin_v1";

function encode(plain: string): string {
    return btoa(
        Array.from(new TextEncoder().encode(`${SALT}:${plain}`))
            .map((b) => String.fromCharCode(b))
            .join("")
    );
}

function decode(encoded: string): string | null {
    try {
        const raw = atob(encoded);
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        const decoded = new TextDecoder().decode(bytes);
        const prefix = `${SALT}:`;
        return decoded.startsWith(prefix) ? decoded.slice(prefix.length) : null;
    } catch {
        return null;
    }
}

export function savePlatformKey(plain: string): void {
    sessionStorage.setItem(STORAGE_KEY, encode(plain));
}

export function loadPlatformKey(): string | null {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? decode(stored) : null;
}

export function clearPlatformKey(): void {
    sessionStorage.removeItem(STORAGE_KEY);
}
