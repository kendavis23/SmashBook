import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useListTrainers } from "./trainer.hooks";

vi.mock("@repo/api-client/modules/share", () => ({
    listTrainersEndpoint: vi.fn(),
}));
import * as shareApi from "@repo/api-client/modules/share";

const CLUB_ID = "club-1";

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
    id: "trainer-1",
    user_id: "user-1",
    club_id: CLUB_ID,
    bio: null,
    is_active: true,
};

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
