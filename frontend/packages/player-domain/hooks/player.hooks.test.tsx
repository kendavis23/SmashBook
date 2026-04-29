import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/share", () => ({
    searchPlayersEndpoint: vi.fn(),
}));

import * as shareApi from "@repo/api-client/modules/share";
import { useSearchPlayers } from "./player.hooks";

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

const mockPlayer = { id: "player-1", full_name: "John Doe", skill_level: 3.0 };

beforeEach(() => {
    vi.mocked(shareApi.searchPlayersEndpoint).mockReset();
});

describe("useSearchPlayers", () => {
    it("returns players with no params", async () => {
        vi.mocked(shareApi.searchPlayersEndpoint).mockResolvedValue([mockPlayer]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useSearchPlayers(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockPlayer]);
        expect(shareApi.searchPlayersEndpoint).toHaveBeenCalledWith(undefined);
    });

    it("passes search params to the endpoint", async () => {
        vi.mocked(shareApi.searchPlayersEndpoint).mockResolvedValue([mockPlayer]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useSearchPlayers({ q: "john" }), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(shareApi.searchPlayersEndpoint).toHaveBeenCalledWith({ q: "john" });
    });

    it("does not fetch when disabled", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useSearchPlayers({ q: "j" }, { enabled: false }), { wrapper: Wrapper });
        expect(shareApi.searchPlayersEndpoint).not.toHaveBeenCalled();
    });
});
