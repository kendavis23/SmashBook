import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { useListEquipment } from "./equipment.hooks";

vi.mock("@repo/api-client/modules/share", () => ({
    listEquipmentEndpoint: vi.fn(),
}));
import * as shareApi from "@repo/api-client/modules/share";

const CLUB_ID = "club-123";
const ITEM_ID = "item-456";

function makeWrapper() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    return { client, Wrapper };
}

const mockItem = {
    id: ITEM_ID,
    item_type: "racket" as const,
    name: "Head Extreme Pro",
    rental_price: 10,
    quantity_total: 5,
    quantity_available: 3,
    condition: "good" as const,
    notes: null,
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useListEquipment", () => {
    it("returns equipment items for a club", async () => {
        vi.mocked(shareApi.listEquipmentEndpoint).mockResolvedValue([mockItem]);
        const { Wrapper } = makeWrapper();
        const { result } = renderHook(() => useListEquipment(CLUB_ID), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([mockItem]);
        expect(shareApi.listEquipmentEndpoint).toHaveBeenCalledWith(CLUB_ID);
    });

    it("does not fetch when clubId is empty", () => {
        const { Wrapper } = makeWrapper();
        renderHook(() => useListEquipment(""), { wrapper: Wrapper });
        expect(shareApi.listEquipmentEndpoint).not.toHaveBeenCalled();
    });
});
