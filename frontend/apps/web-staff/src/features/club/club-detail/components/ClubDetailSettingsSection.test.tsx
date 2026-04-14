import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ClubSettingsTable from "./ClubDetailSettingsSection";
import type { ClubSettingsInput } from "../../types";

const baseForm: ClubSettingsInput = {
    booking_duration_minutes: 60,
    max_advance_booking_days: 14,
    min_booking_notice_hours: 2,
    max_bookings_per_player_per_week: 5,
    min_players_to_confirm: 2,
    skill_level_min: 1.0,
    skill_level_max: 5.0,
    skill_range_allowed: 2.0,
    auto_cancel_hours_before: 24,
    cancellation_notice_hours: 12,
    cancellation_refund_pct: 80,
    reminder_hours_before: 2,
    open_games_enabled: false,
    waitlist_enabled: true,
};

vi.mock("@repo/ui", () => ({
    FormField: ({ label, children }: { label: string; children: ReactNode }) => (
        <div>
            <label>{label}</label>
            {children}
        </div>
    ),
    Toggle: ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
        <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
            toggle
        </button>
    ),
}));

describe("ClubSettingsTable", () => {
    it("renders section headings", () => {
        render(<ClubSettingsTable form={baseForm} onChange={vi.fn()} />);
        expect(screen.getByText("Booking rules")).toBeInTheDocument();
        expect(screen.getByText("Player matching")).toBeInTheDocument();
        expect(screen.getByText("Cancellations and reminders")).toBeInTheDocument();
        expect(screen.getByText("Features")).toBeInTheDocument();
    });

    it("renders booking duration field with current value", () => {
        render(<ClubSettingsTable form={baseForm} onChange={vi.fn()} />);
        expect(screen.getByDisplayValue("60")).toBeInTheDocument();
    });

    it("calls onChange with booking_duration_minutes when input changes", () => {
        const handleChange = vi.fn();
        render(<ClubSettingsTable form={baseForm} onChange={handleChange} />);
        const inputs = screen.getAllByDisplayValue("60");
        // getAllByDisplayValue always returns at least one element here
        fireEvent.change(inputs[0]!, { target: { value: "90" } });
        expect(handleChange).toHaveBeenCalledWith("booking_duration_minutes", 90);
    });

    it("calls onChange with max_advance_booking_days", () => {
        const handleChange = vi.fn();
        render(<ClubSettingsTable form={baseForm} onChange={handleChange} />);
        const input = screen.getByDisplayValue("14");
        fireEvent.change(input, { target: { value: "30" } });
        expect(handleChange).toHaveBeenCalledWith("max_advance_booking_days", 30);
    });

    it("calls onChange with open_games_enabled when toggle clicked", () => {
        const handleChange = vi.fn();
        render(<ClubSettingsTable form={baseForm} onChange={handleChange} />);
        const toggles = screen.getAllByRole("switch");
        // getAllByRole guaranteed to return 2 toggles rendered by the mock
        fireEvent.click(toggles[0]!);
        expect(handleChange).toHaveBeenCalledWith("open_games_enabled", true);
    });

    it("calls onChange with waitlist_enabled when toggle clicked", () => {
        const handleChange = vi.fn();
        render(<ClubSettingsTable form={baseForm} onChange={handleChange} />);
        const toggles = screen.getAllByRole("switch");
        // getAllByRole guaranteed to return 2 toggles rendered by the mock
        fireEvent.click(toggles[1]!);
        expect(handleChange).toHaveBeenCalledWith("waitlist_enabled", false);
    });

    it("renders skill level min field", () => {
        render(<ClubSettingsTable form={baseForm} onChange={vi.fn()} />);
        expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    });

    it("renders cancellation refund pct field", () => {
        render(<ClubSettingsTable form={baseForm} onChange={vi.fn()} />);
        expect(screen.getByDisplayValue("80")).toBeInTheDocument();
    });
});
