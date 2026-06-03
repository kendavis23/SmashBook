import { describe, expect, it, vi, afterEach } from "vitest";
import {
    formatPlayedDate,
    daysSince,
    relativePlayedLabel,
    playerDisplayName,
    playerInitials,
    avatarTone,
} from "./playerValueConstants";

describe("formatPlayedDate", () => {
    it("formats a bare YYYY-MM-DD without timezone drift", () => {
        expect(formatPlayedDate("2026-06-02")).toBe("02 Jun 2026");
    });

    it("handles an ISO timestamp by taking the date part", () => {
        expect(formatPlayedDate("2026-01-12T23:30:00Z")).toBe("12 Jan 2026");
    });

    it("returns em dash for null / empty / garbage", () => {
        expect(formatPlayedDate(null)).toBe("—");
        expect(formatPlayedDate("")).toBe("—");
        expect(formatPlayedDate("not-a-date")).toBe("—");
    });
});

describe("daysSince / relativePlayedLabel", () => {
    afterEach(() => vi.useRealTimers());

    function freezeAt(iso: string) {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(iso));
    }

    it("counts whole UTC days since the date", () => {
        freezeAt("2026-06-03T08:00:00Z");
        expect(daysSince("2026-06-01")).toBe(2);
        expect(daysSince("2026-06-03")).toBe(0);
    });

    it("clamps future dates to 0 and returns null for unparseable input", () => {
        freezeAt("2026-06-03T08:00:00Z");
        expect(daysSince("2026-06-10")).toBe(0);
        expect(daysSince(null)).toBeNull();
        expect(daysSince("bad")).toBeNull();
    });

    it("renders Today / Yesterday / N days ago", () => {
        freezeAt("2026-06-03T08:00:00Z");
        expect(relativePlayedLabel("2026-06-03")).toBe("Today");
        expect(relativePlayedLabel("2026-06-02")).toBe("Yesterday");
        expect(relativePlayedLabel("2026-05-29")).toBe("5 days ago");
        expect(relativePlayedLabel(null)).toBe("—");
    });
});

describe("playerDisplayName", () => {
    it("prefers full name, then email, then a placeholder", () => {
        expect(playerDisplayName("Arjun Mehta", "a@x.com")).toBe("Arjun Mehta");
        expect(playerDisplayName("  ", "a@x.com")).toBe("a@x.com");
        expect(playerDisplayName(null, null)).toBe("Unknown player");
    });
});

describe("playerInitials", () => {
    it("builds 2-letter initials from first + last name", () => {
        expect(playerInitials("Arjun Mehta", null)).toBe("AM");
    });
    it("falls back to first two letters of a single token", () => {
        expect(playerInitials("Arjun", null)).toBe("AR");
    });
    it("uses email when no name, and ? when nothing", () => {
        expect(playerInitials(null, "neha@x.com")).toBe("NE");
        expect(playerInitials(null, null)).toBe("?");
    });
});

describe("avatarTone", () => {
    it("is deterministic for the same seed and a valid token class", () => {
        const a = avatarTone("user-1");
        expect(avatarTone("user-1")).toBe(a);
        expect(a).toMatch(/bg-/);
    });
});
