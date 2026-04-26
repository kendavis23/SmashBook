import { describe, it, expect, vi, beforeEach } from "vitest";
import { listTrainersEndpoint } from "./trainer.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";

const mockTrainer = {
    id: "trainer-1",
    user_id: "user-1",
    club_id: CLUB_ID,
    bio: null,
    is_active: true,
};

describe("listTrainersEndpoint", () => {
    it("calls GET /api/v1/trainers with club_id", async () => {
        mockFetcher.mockResolvedValue([mockTrainer]);
        await listTrainersEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/trainers?club_id=${CLUB_ID}`);
    });

    it("calls GET /api/v1/trainers with include_inactive", async () => {
        mockFetcher.mockResolvedValue([mockTrainer]);
        await listTrainersEndpoint(CLUB_ID, true);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/trainers?club_id=${CLUB_ID}&include_inactive=true`
        );
    });
});
