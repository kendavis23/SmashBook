import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useListTrainers, useListAvailableTrainers } from "./trainer.hooks";

vi.mock("@repo/api-client/modules/share", () => ({
    listTrainersEndpoint: vi.fn(),
    listAvailableTrainersEndpoint: vi.fn(),
}));
import * as shareApi from "@repo/api-client/modules/share";

const CLUB_ID = "club-1";
const TRAINER_ID = "trainer-1";

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

const mockTrainer = {
    id: TRAINER_ID,
    user_id: "user-1",
    club_id: CLUB_ID,
    bio: null,
    is_active: true,
};

const AVAILABLE_PARAMS = {
    clubId: CLUB_ID,
    date: "2026-05-01",
    startTime: "10:00:00",
    endTime: "11:00:00",
};

const mockAvailableSummary = {
    staff_profile_id: TRAINER_ID,
    club_id: CLUB_ID,
    full_name: "Jane Trainer",
    bio: null,
};

describe("useListAvailableTrainers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns available trainers for a slot", async () => {
        vi.mocked(shareApi.listAvailableTrainersEndpoint).mockResolvedValue([mockAvailableSummary]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListAvailableTrainers(AVAILABLE_PARAMS), {
            wrapper: Wrapper,
        });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockAvailableSummary]);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListAvailableTrainers({ ...AVAILABLE_PARAMS, clubId: "" }), {
            wrapper: Wrapper,
        });
        expect(shareApi.listAvailableTrainersEndpoint).not.toHaveBeenCalled();
    });

    it("does not fetch when date is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListAvailableTrainers({ ...AVAILABLE_PARAMS, date: "" }), {
            wrapper: Wrapper,
        });
        expect(shareApi.listAvailableTrainersEndpoint).not.toHaveBeenCalled();
    });
});

describe("useListTrainers", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns trainers for a club", async () => {
        vi.mocked(shareApi.listTrainersEndpoint).mockResolvedValue([mockTrainer]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListTrainers(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockTrainer]);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListTrainers(""), { wrapper: Wrapper });
        expect(shareApi.listTrainersEndpoint).not.toHaveBeenCalled();
    });
});
