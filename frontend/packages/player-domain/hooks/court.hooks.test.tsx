import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("@repo/api-client/modules/share", () => ({
    listCourtsEndpoint: vi.fn(),
    getCourtAvailabilityEndpoint: vi.fn(),
}));

import * as shareApi from "@repo/api-client/modules/share";

import { useListCourts, useGetCourtAvailability } from "./court.hooks";

const CLUB_ID = "club-123";
const COURT_ID = "court-456";

const mockCourt = {
    id: COURT_ID,
    club_id: CLUB_ID,
    name: "Court 1",
    surface_type: "indoor" as const,
    has_lighting: true,
    lighting_surcharge: null,
    is_active: true,
};

const mockAvailability = {
    court_id: COURT_ID,
    date: "2026-04-26",
    slots: [],
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

describe("useListCourts", () => {
    it("returns courts for a club", async () => {
        vi.mocked(shareApi.listCourtsEndpoint).mockResolvedValue([mockCourt]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListCourts(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockCourt]);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListCourts(""), { wrapper: Wrapper });
        expect(shareApi.listCourtsEndpoint).not.toHaveBeenCalled();
    });
});

describe("useGetCourtAvailability", () => {
    it("returns availability for a court on a given date", async () => {
        vi.mocked(shareApi.getCourtAvailabilityEndpoint).mockResolvedValue(mockAvailability);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useGetCourtAvailability(COURT_ID, "2026-04-26"), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(mockAvailability);
    });

    it("does not fetch when courtId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetCourtAvailability("", "2026-04-26"), { wrapper: Wrapper });
        expect(shareApi.getCourtAvailabilityEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when date is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useGetCourtAvailability(COURT_ID, ""), { wrapper: Wrapper });
        expect(shareApi.getCourtAvailabilityEndpoint).not.toHaveBeenCalled();
    });
});
