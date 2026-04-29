import { describe, it, expect, vi, beforeEach } from "vitest";
import { listAvailableTrainersEndpoint, listTrainersEndpoint } from "./trainer.api";

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

describe("listAvailableTrainersEndpoint", () => {
    it("calls GET /api/v1/trainers/available with all params", async () => {
        const mockSummary = { staff_profile_id: "trainer-1", club_id: CLUB_ID, full_name: "Jane Trainer", bio: null };
        mockFetcher.mockResolvedValue([mockSummary]);
        await listAvailableTrainersEndpoint({
            clubId: CLUB_ID,
            date: "2026-05-01",
            startTime: "10:00:00",
            endTime: "11:00:00",
        });
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/trainers/available?club_id=${CLUB_ID}&date=2026-05-01&start_time=10%3A00%3A00&end_time=11%3A00%3A00`
        );
    });
});
