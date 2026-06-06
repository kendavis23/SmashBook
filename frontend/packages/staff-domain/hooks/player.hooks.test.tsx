import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
    invitePlayerEndpoint: vi.fn(),
    updateSkillLevelEndpoint: vi.fn(),
    getSkillHistoryEndpoint: vi.fn(),
}));

vi.mock("@repo/api-client/modules/share", () => ({
    searchPlayersEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import * as shareApi from "@repo/api-client/modules/share";
import {
    useInviteNewPlayer,
    useUpdateSkillLevel,
    useGetSkillHistory,
    useSearchPlayers,
} from "./player.hooks";

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

const PLAYER_ID = "player-1";
const CLUB_ID = "club-1";

const mockHistoryItem = {
    id: "hist-1",
    previous_level: 2.5,
    new_level: 3.0,
    assigned_by: "staff-1",
    reason: "Improved serve",
    created_at: "2026-04-27T10:00:00Z",
};

const mockSkillResult = {
    user_id: PLAYER_ID,
    skill_level: 3.0,
    skill_assigned_by: "staff-1",
    skill_assigned_at: "2026-04-27T10:00:00Z",
    history_entry: mockHistoryItem,
};

beforeEach(() => {
    vi.mocked(staffApi.invitePlayerEndpoint).mockReset();
    vi.mocked(staffApi.updateSkillLevelEndpoint).mockReset();
    vi.mocked(staffApi.getSkillHistoryEndpoint).mockReset();
    vi.mocked(shareApi.searchPlayersEndpoint).mockReset();
});

const mockInviteResult = { user_id: "player-2", email: "jane@example.com", club_id: "club-1" };

describe("useInviteNewPlayer", () => {
    it("calls invitePlayerEndpoint with the correct args", async () => {
        vi.mocked(staffApi.invitePlayerEndpoint).mockResolvedValue(mockInviteResult);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useInviteNewPlayer(), { wrapper: Wrapper });
        result.current.mutate({
            email: "jane@example.com",
            full_name: "Jane Doe",
            club_id: "club-1",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.invitePlayerEndpoint).toHaveBeenCalledWith({
            email: "jane@example.com",
            full_name: "Jane Doe",
            club_id: "club-1",
        });
    });

    it("invalidates the player search cache on success", async () => {
        vi.mocked(staffApi.invitePlayerEndpoint).mockResolvedValue(mockInviteResult);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useInviteNewPlayer(), { wrapper: Wrapper });
        result.current.mutate({
            email: "jane@example.com",
            full_name: "Jane Doe",
            club_id: "club-1",
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["players", "search"] })
        );
    });
});

describe("useUpdateSkillLevel", () => {
    it("calls updateSkillLevelEndpoint and invalidates skill history", async () => {
        vi.mocked(staffApi.updateSkillLevelEndpoint).mockResolvedValue(mockSkillResult);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateSkillLevel(PLAYER_ID, CLUB_ID), {
            wrapper: Wrapper,
        });
        result.current.mutate({ new_level: 3.0, reason: "Improved serve" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateSkillLevelEndpoint).toHaveBeenCalledWith(PLAYER_ID, CLUB_ID, {
            new_level: 3.0,
            reason: "Improved serve",
        });
        expect(invalidate).toHaveBeenCalledWith(
            expect.objectContaining({ queryKey: ["players", PLAYER_ID, "skill-history"] })
        );
    });
});

describe("useGetSkillHistory", () => {
    it("returns skill history for a player", async () => {
        vi.mocked(staffApi.getSkillHistoryEndpoint).mockResolvedValue([mockHistoryItem]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetSkillHistory(PLAYER_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockHistoryItem]);
    });

    it("does not fetch when playerId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetSkillHistory(""), { wrapper: Wrapper });
        expect(staffApi.getSkillHistoryEndpoint).not.toHaveBeenCalled();
    });
});

const mockPlayerSearchResult = { id: "player-1", full_name: "John Doe", skill_level: 3.0 };

describe("useSearchPlayers", () => {
    it("returns players with no params", async () => {
        vi.mocked(shareApi.searchPlayersEndpoint).mockResolvedValue([mockPlayerSearchResult]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useSearchPlayers(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockPlayerSearchResult]);
        expect(shareApi.searchPlayersEndpoint).toHaveBeenCalledWith(undefined);
    });

    it("passes search params to the endpoint", async () => {
        vi.mocked(shareApi.searchPlayersEndpoint).mockResolvedValue([mockPlayerSearchResult]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useSearchPlayers({ q: "john" }), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.searchPlayersEndpoint).toHaveBeenCalledWith({ q: "john" });
    });
});
