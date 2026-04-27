import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/staff", () => ({
    registerPlayerEndpoint: vi.fn(),
    updateSkillLevelEndpoint: vi.fn(),
    getSkillHistoryEndpoint: vi.fn(),
}));

import * as staffApi from "@repo/api-client/modules/staff";
import { useRegisterPlayer, useUpdateSkillLevel, useGetSkillHistory } from "./player.hooks";

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

const mockToken = {
    access_token: "access",
    refresh_token: "refresh",
    token_type: "bearer",
    clubs: [],
};

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
    vi.mocked(staffApi.registerPlayerEndpoint).mockReset();
    vi.mocked(staffApi.updateSkillLevelEndpoint).mockReset();
    vi.mocked(staffApi.getSkillHistoryEndpoint).mockReset();
});

describe("useRegisterPlayer", () => {
    it("calls registerPlayerEndpoint with correct args", async () => {
        vi.mocked(staffApi.registerPlayerEndpoint).mockResolvedValue(mockToken);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useRegisterPlayer(), { wrapper: Wrapper });
        const data = {
            tenant_subdomain: "club-a",
            email: "player@example.com",
            full_name: "Test Player",
            password: "password123",
        };
        result.current.mutate(data);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.registerPlayerEndpoint).toHaveBeenCalledWith(data);
    });
});

describe("useUpdateSkillLevel", () => {
    it("calls updateSkillLevelEndpoint and invalidates skill history", async () => {
        vi.mocked(staffApi.updateSkillLevelEndpoint).mockResolvedValue(mockSkillResult);
        const { Wrapper, client } = makeWrapper();
        const invalidate = vi.spyOn(client, "invalidateQueries");
        const { result } = renderHook(() => useUpdateSkillLevel(PLAYER_ID), { wrapper: Wrapper });
        result.current.mutate({ new_level: 3.0, reason: "Improved serve" });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(staffApi.updateSkillLevelEndpoint).toHaveBeenCalledWith(PLAYER_ID, {
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
