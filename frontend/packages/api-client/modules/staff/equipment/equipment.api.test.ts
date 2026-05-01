import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    createEquipmentEndpoint,
    updateEquipmentEndpoint,
    retireEquipmentEndpoint,
} from "./equipment.api";

vi.mock("../../../core/fetcher", () => ({
    fetcher: vi.fn(),
}));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";
const ITEM_ID = "item-456";

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

describe("createEquipmentEndpoint", () => {
    it("calls POST /api/v1/equipment with club_id and body", async () => {
        mockFetcher.mockResolvedValue(mockItem);
        const data = {
            item_type: "racket" as const,
            name: "Head Extreme Pro",
            quantity_total: 5,
            rental_price: 10,
        };
        await createEquipmentEndpoint(CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/equipment?club_id=${CLUB_ID}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("updateEquipmentEndpoint", () => {
    it("calls PATCH /api/v1/equipment/:itemId with club_id and body", async () => {
        mockFetcher.mockResolvedValue(mockItem);
        const data = { name: "Head Extreme Pro 2026", rental_price: 12 };
        await updateEquipmentEndpoint(ITEM_ID, CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/equipment/${ITEM_ID}?club_id=${CLUB_ID}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});

describe("retireEquipmentEndpoint", () => {
    it("calls DELETE /api/v1/equipment/:itemId with club_id", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await retireEquipmentEndpoint(ITEM_ID, CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/equipment/${ITEM_ID}?club_id=${CLUB_ID}`,
            { method: "DELETE" }
        );
    });
});
