import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listTrainersEndpoint,
    getTrainerAvailabilityEndpoint,
    setTrainerAvailabilityEndpoint,
    updateTrainerAvailabilityEndpoint,
    deleteTrainerAvailabilityEndpoint,
    getTrainerBookingsEndpoint,
} from "./trainer.api";

vi.mock("../../../core/fetcher", () => ({ fetcher: vi.fn() }));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";
const TRAINER_ID = "trainer-456";
const AVAILABILITY_ID = "avail-789";

const mockAvailability = {
    id: AVAILABILITY_ID,
    staff_profile_id: TRAINER_ID,
    day_of_week: 1,
    start_time: "09:00:00",
    end_time: "17:00:00",
    set_by_user_id: "user-1",
    effective_from: "2026-04-01",
    effective_until: null,
    notes: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
};

const mockTrainer = {
    id: TRAINER_ID,
    user_id: "user-1",
    club_id: CLUB_ID,
    bio: null,
    is_active: true,
    availability: [mockAvailability],
};

const mockBookingItem = {
    booking_id: "booking-1",
    club_id: CLUB_ID,
    court_id: "court-1",
    court_name: "Court 1",
    booking_type: "lesson_individual" as const,
    status: "confirmed" as const,
    start_datetime: "2026-04-12T10:00:00Z",
    end_datetime: "2026-04-12T11:00:00Z",
    participants: [],
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

describe("getTrainerAvailabilityEndpoint", () => {
    it("calls GET /api/v1/trainers/:trainerId/availability", async () => {
        mockFetcher.mockResolvedValue([mockAvailability]);
        await getTrainerAvailabilityEndpoint(TRAINER_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/trainers/${TRAINER_ID}/availability`);
    });
});

describe("setTrainerAvailabilityEndpoint", () => {
    it("calls POST /api/v1/trainers/:trainerId/availability with body", async () => {
        mockFetcher.mockResolvedValue(mockAvailability);
        const data = {
            club_id: CLUB_ID,
            day_of_week: 1,
            start_time: "09:00:00",
            end_time: "17:00:00",
            effective_from: "2026-04-01",
        };
        await setTrainerAvailabilityEndpoint(TRAINER_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/trainers/${TRAINER_ID}/availability`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("updateTrainerAvailabilityEndpoint", () => {
    it("calls PUT /api/v1/trainers/:trainerId/availability/:availabilityId with body", async () => {
        mockFetcher.mockResolvedValue(mockAvailability);
        const data = { notes: "Updated notes" };
        await updateTrainerAvailabilityEndpoint(TRAINER_ID, AVAILABILITY_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/trainers/${TRAINER_ID}/availability/${AVAILABILITY_ID}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }
        );
    });
});

describe("deleteTrainerAvailabilityEndpoint", () => {
    it("calls DELETE /api/v1/trainers/:trainerId/availability/:availabilityId", async () => {
        mockFetcher.mockResolvedValue(undefined);
        await deleteTrainerAvailabilityEndpoint(TRAINER_ID, AVAILABILITY_ID);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/trainers/${TRAINER_ID}/availability/${AVAILABILITY_ID}`,
            { method: "DELETE" }
        );
    });
});

describe("getTrainerBookingsEndpoint", () => {
    it("calls GET /api/v1/trainers/:trainerId/bookings without params", async () => {
        mockFetcher.mockResolvedValue([mockBookingItem]);
        await getTrainerBookingsEndpoint(TRAINER_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/trainers/${TRAINER_ID}/bookings`);
    });

    it("calls GET /api/v1/trainers/:trainerId/bookings with upcoming_only", async () => {
        mockFetcher.mockResolvedValue([mockBookingItem]);
        await getTrainerBookingsEndpoint(TRAINER_ID, false);
        expect(mockFetcher).toHaveBeenCalledWith(
            `/api/v1/trainers/${TRAINER_ID}/bookings?upcoming_only=false`
        );
    });
});
