import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    listClubsEndpoint,
    createClubEndpoint,
    getClubEndpoint,
    updateClubEndpoint,
    updateClubSettingsEndpoint,
    getOperatingHoursEndpoint,
    setOperatingHoursEndpoint,
    getPricingRulesEndpoint,
    setPricingRulesEndpoint,
    stripeConnectEndpoint,
} from "./club.api";

vi.mock("../../../core/fetcher", () => ({
    fetcher: vi.fn(),
}));

import { fetcher } from "../../../core/fetcher";
const mockFetcher = vi.mocked(fetcher);

beforeEach(() => {
    mockFetcher.mockReset();
});

const CLUB_ID = "club-123";

const mockClub = {
    id: CLUB_ID,
    tenant_id: "tenant-1",
    name: "Test Club",
    address: null,
    currency: "EUR",
    booking_duration_minutes: 90,
    max_advance_booking_days: 14,
    min_booking_notice_hours: 2,
    max_bookings_per_player_per_week: null,
    skill_level_min: 1,
    skill_level_max: 10,
    skill_range_allowed: 2,
    open_games_enabled: true,
    min_players_to_confirm: 2,
    auto_cancel_hours_before: null,
    cancellation_notice_hours: 24,
    cancellation_refund_pct: 100,
    reminder_hours_before: 2,
    waitlist_enabled: false,
};

describe("listClubsEndpoint", () => {
    it("calls GET /api/v1/clubs", async () => {
        mockFetcher.mockResolvedValue([mockClub]);
        const result = await listClubsEndpoint();
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs");
        expect(result).toEqual([mockClub]);
    });
});

describe("createClubEndpoint", () => {
    it("calls POST /api/v1/clubs with body", async () => {
        mockFetcher.mockResolvedValue(mockClub);
        const data = { name: "Test Club" };
        await createClubEndpoint(data);
        expect(mockFetcher).toHaveBeenCalledWith("/api/v1/clubs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("getClubEndpoint", () => {
    it("calls GET /api/v1/clubs/:id", async () => {
        mockFetcher.mockResolvedValue(mockClub);
        await getClubEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}`);
    });
});

describe("updateClubEndpoint", () => {
    it("calls PATCH /api/v1/clubs/:id with body", async () => {
        mockFetcher.mockResolvedValue(mockClub);
        const data = { name: "Updated" };
        await updateClubEndpoint(CLUB_ID, data);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
    });
});

describe("updateClubSettingsEndpoint", () => {
    it("calls PATCH /api/v1/clubs/:id/settings", async () => {
        const settings = { booking_duration_minutes: 60 };
        mockFetcher.mockResolvedValue(settings);
        await updateClubSettingsEndpoint(CLUB_ID, settings);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/settings`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
        });
    });
});

describe("getOperatingHoursEndpoint", () => {
    it("calls GET /api/v1/clubs/:id/operating-hours", async () => {
        mockFetcher.mockResolvedValue([]);
        await getOperatingHoursEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/operating-hours`);
    });
});

describe("setOperatingHoursEndpoint", () => {
    it("calls PUT /api/v1/clubs/:id/operating-hours with body", async () => {
        const hours = [{ day_of_week: 1, open_time: "08:00", close_time: "22:00" }];
        mockFetcher.mockResolvedValue(hours);
        await setOperatingHoursEndpoint(CLUB_ID, hours);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/operating-hours`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(hours),
        });
    });
});

describe("getPricingRulesEndpoint", () => {
    it("calls GET /api/v1/clubs/:id/pricing-rules", async () => {
        mockFetcher.mockResolvedValue([]);
        await getPricingRulesEndpoint(CLUB_ID);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/pricing-rules`);
    });
});

describe("setPricingRulesEndpoint", () => {
    it("calls PUT /api/v1/clubs/:id/pricing-rules with body", async () => {
        const rules = [{ label: "Peak", day_of_week: 1, start_time: "18:00", end_time: "21:00", price_per_slot: 20 }];
        mockFetcher.mockResolvedValue(rules);
        await setPricingRulesEndpoint(CLUB_ID, rules);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/pricing-rules`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rules),
        });
    });
});

describe("stripeConnectEndpoint", () => {
    it("calls POST /api/v1/clubs/:id/stripe-connect with body", async () => {
        const req = { return_url: "https://example.com/return", refresh_url: "https://example.com/refresh" };
        mockFetcher.mockResolvedValue({ onboarding_url: "https://stripe.com/onboard" });
        await stripeConnectEndpoint(CLUB_ID, req);
        expect(mockFetcher).toHaveBeenCalledWith(`/api/v1/clubs/${CLUB_ID}/stripe-connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
    });
});
