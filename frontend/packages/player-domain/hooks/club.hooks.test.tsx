import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/player", () => ({
    getClubAvailabilityEndpoint: vi.fn(),
}));

import * as playerApi from "@repo/api-client/modules/player";
import { useGetClubAvailability } from "./club.hooks";

const CLUB_ID = "club-123";
const BASE_PARAMS = { start_date: "2026-06-01" };

const mockAvailability = {
    club_id: CLUB_ID,
    courts: [],
    days: [],
    next_cursor: null,
};

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useGetClubAvailability", () => {
    it("returns availability for a club", async () => {
        vi.mocked(playerApi.getClubAvailabilityEndpoint).mockResolvedValue(mockAvailability);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetClubAvailability(CLUB_ID, BASE_PARAMS), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockAvailability);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetClubAvailability("", BASE_PARAMS), { wrapper: Wrapper });
        expect(playerApi.getClubAvailabilityEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when start_date is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetClubAvailability(CLUB_ID, { start_date: "" }), { wrapper: Wrapper });
        expect(playerApi.getClubAvailabilityEndpoint).not.toHaveBeenCalled();
    });
});
