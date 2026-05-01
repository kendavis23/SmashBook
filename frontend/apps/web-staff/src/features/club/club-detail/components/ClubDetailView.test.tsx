import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDetailView from "./ClubDetailView";
import type { Club, OperatingHours, PricingRule } from "../../types";

const mockClub: Club = {
    id: "club-1",
    name: "Alpha Club",
    address: "1 Main St",
    currency: "GBP",
    booking_duration_minutes: 60,
    max_advance_booking_days: 30,
    min_booking_notice_hours: 2,
    max_bookings_per_player_per_week: null,
    min_players_to_confirm: 2,
    skill_level_min: 1,
    skill_level_max: 5,
    skill_range_allowed: 2,
    auto_cancel_hours_before: 24,
    cancellation_notice_hours: 12,
    cancellation_refund_pct: 100,
    reminder_hours_before: 2,
    open_games_enabled: true,
    waitlist_enabled: false,
} as unknown as Club;

const mockHours: OperatingHours[] = [{ day_of_week: 0, open_time: "09:00", close_time: "21:00" }];

const mockRules: PricingRule[] = [
    {
        label: "Peak",
        day_of_week: 0,
        start_time: "08:00",
        end_time: "20:00",
        is_active: true,
        price_per_slot: 20,
    },
];

describe("ClubDetailView — booking rules section", () => {
    it("renders booking duration", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={[]}
                hoursLoading={false}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        expect(screen.getByText("Duration (min)")).toBeInTheDocument();
        expect(screen.getByText("60")).toBeInTheDocument();
    });

    it("renders open games as Yes", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={[]}
                hoursLoading={false}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        expect(screen.getByText("Open games")).toBeInTheDocument();
        expect(screen.getByText("Yes")).toBeInTheDocument();
    });
});

describe("ClubDetailView — operating hours section", () => {
    it("shows loading text when hoursLoading", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={[]}
                hoursLoading={true}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        expect(screen.getByText("Loading…")).toBeInTheDocument();
    });

    it("renders open day hours", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={mockHours}
                rules={[]}
                hoursLoading={false}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        expect(screen.getByText("9:00 AM – 9:00 PM")).toBeInTheDocument();
    });

    it("renders Closed for days with no hours", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={[]}
                hoursLoading={false}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        expect(screen.getAllByText("Closed").length).toBeGreaterThan(0);
    });
});

describe("ClubDetailView — pricing rules section", () => {
    it("shows loading when rulesLoading", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={[]}
                hoursLoading={false}
                rulesLoading={true}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        // Only one loading shown at a time depending on state
        expect(screen.getAllByText("Loading…").length).toBeGreaterThan(0);
    });

    it("shows empty message when no rules", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={[]}
                hoursLoading={false}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        expect(screen.getByText("No pricing rules configured.")).toBeInTheDocument();
    });

    it("renders rule label in table", () => {
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={mockRules}
                hoursLoading={false}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={vi.fn()}
            />
        );
        expect(screen.getByText("Peak")).toBeInTheDocument();
    });

    it("calls onRulesPageChange when Next is clicked on multiple pages", () => {
        const manyRules = Array.from({ length: 10 }, (_, i) => ({
            ...mockRules[0],
            label: `Rule ${i}`,
        })) as PricingRule[];
        const handlePageChange = vi.fn();
        render(
            <ClubDetailView
                club={mockClub}
                hours={[]}
                rules={manyRules}
                hoursLoading={false}
                rulesLoading={false}
                rulesPage={0}
                onRulesPageChange={handlePageChange}
            />
        );
        fireEvent.click(screen.getByText("Next"));
        expect(handlePageChange).toHaveBeenCalledWith(1);
    });
});
