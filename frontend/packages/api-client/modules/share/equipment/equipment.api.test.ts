import { describe, it, expect, vi, beforeEach } from "vitest";
import { listEquipmentEndpoint } from "./equipment.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";

describe("listEquipmentEndpoint", () => {
    it("calls GET /api/v1/equipment with club_id", async () => {
        mockFetcher.mockResolvedValue([]);
        await listEquipmentEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/equipment?club_id=${CLUB_ID}`);
    });
});
