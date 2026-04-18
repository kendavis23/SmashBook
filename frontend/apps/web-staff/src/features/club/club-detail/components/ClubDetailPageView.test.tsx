import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClubDetailPageView from "./ClubDetailPageView";
import type { Club, ClubSettingsInput } from "../../types";
import type { Tab } from "../../types";

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, variant }: { title: string; variant: string }) => (
        <div role="alert" data-variant={variant}>
            {title}
        </div>
    ),
    Breadcrumb: ({ items }: { items: { label: string; onClick?: () => void }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label} onClick={item.onClick}>
                    {item.label}
                </span>
            ))}
        </nav>
    ),
}));

vi.mock("./ClubDetailSettingsSection", () => ({
    default: () => <div data-testid="settings-section" />,
}));

vi.mock("./ClubDetailPricingRulesSection", () => ({
    default: () => <div data-testid="pricing-section" />,
}));

vi.mock("./ClubDetailHoursSection", () => ({
    default: () => <div data-testid="hours-section" />,
}));

vi.mock("./ClubDetailViewSection", () => ({
    default: () => <div data-testid="view-section" />,
}));

const mockClub: Club = {
    id: "club-1",
    name: "Test Club",
    address: "123 Padel St",
    currency: "GBP",
} as Club;

const mockSettingsForm: ClubSettingsInput = {
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
    waitlist_enabled: false,
};

const visibleTabs: { id: Tab; label: string }[] = [
    { id: "view", label: "View" },
    { id: "settings", label: "Settings" },
    { id: "hours", label: "Operating Hours" },
    { id: "pricing", label: "Pricing Rules" },
];

const defaultProps = {
    club: mockClub,
    clubId: "club-1",
    visibleTabs,
    activeTab: "view" as Tab,
    settingsForm: mockSettingsForm,
    updateSettingsIsPending: false,
    updateSettingsIsSuccess: false,
    updateSettingsError: null,
    settingsToastDismissed: false,
    onTabChange: vi.fn(),
    onEditOpen: vi.fn(),
    onSettingsChange: vi.fn(),
    onSettingsSave: vi.fn(),
    onSettingsCancel: vi.fn(),
    onSettingsToastDismiss: vi.fn(),
    onNavigateBack: vi.fn(),
    canEdit: true,
};

describe("ClubDetailPageView", () => {
    it("renders club name", () => {
        render(<ClubDetailPageView {...defaultProps} />);
        expect(screen.getByText("Test Club")).toBeInTheDocument();
    });

    it("renders club address", () => {
        render(<ClubDetailPageView {...defaultProps} />);
        expect(screen.getByText(/123 Padel St/)).toBeInTheDocument();
    });

    it("renders currency", () => {
        render(<ClubDetailPageView {...defaultProps} />);
        expect(screen.getByText(/Currency: GBP/)).toBeInTheDocument();
    });

    it("renders all tabs", () => {
        render(<ClubDetailPageView {...defaultProps} />);
        expect(screen.getByText("View")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
        expect(screen.getByText("Operating Hours")).toBeInTheDocument();
        expect(screen.getByText("Pricing Rules")).toBeInTheDocument();
    });

    it("calls onTabChange when a tab is clicked", () => {
        const handleTabChange = vi.fn();
        render(<ClubDetailPageView {...defaultProps} onTabChange={handleTabChange} />);
        fireEvent.click(screen.getByText("Settings"));
        expect(handleTabChange).toHaveBeenCalledWith("settings");
    });

    it("calls onEditOpen when Edit Club is clicked", () => {
        const handleEdit = vi.fn();
        render(<ClubDetailPageView {...defaultProps} onEditOpen={handleEdit} />);
        fireEvent.click(screen.getByText("Edit Club"));
        expect(handleEdit).toHaveBeenCalled();
    });

    it("calls onNavigateBack when Clubs breadcrumb is clicked", () => {
        const handleBack = vi.fn();
        render(<ClubDetailPageView {...defaultProps} onNavigateBack={handleBack} />);
        fireEvent.click(screen.getByText("Clubs"));
        expect(handleBack).toHaveBeenCalled();
    });

    it("renders view section when activeTab is 'view'", () => {
        render(<ClubDetailPageView {...defaultProps} activeTab="view" />);
        expect(screen.getByTestId("view-section")).toBeInTheDocument();
    });

    it("renders settings section when activeTab is 'settings'", () => {
        render(<ClubDetailPageView {...defaultProps} activeTab="settings" />);
        expect(screen.getByTestId("settings-section")).toBeInTheDocument();
    });

    it("renders hours section when activeTab is 'hours'", () => {
        render(<ClubDetailPageView {...defaultProps} activeTab="hours" />);
        expect(screen.getByTestId("hours-section")).toBeInTheDocument();
    });

    it("renders pricing section when activeTab is 'pricing'", () => {
        render(<ClubDetailPageView {...defaultProps} activeTab="pricing" />);
        expect(screen.getByTestId("pricing-section")).toBeInTheDocument();
    });

    it("shows success toast on settings tab when updateSettingsIsSuccess is true", () => {
        render(
            <ClubDetailPageView
                {...defaultProps}
                activeTab="settings"
                updateSettingsIsSuccess={true}
            />
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Settings saved successfully.");
    });

    it("shows error toast on settings tab when updateSettingsError is set", () => {
        render(
            <ClubDetailPageView
                {...defaultProps}
                activeTab="settings"
                updateSettingsError={new Error("Save failed")}
            />
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    });

    it("does not show toast when settingsToastDismissed is true", () => {
        render(
            <ClubDetailPageView
                {...defaultProps}
                activeTab="settings"
                updateSettingsIsSuccess={true}
                settingsToastDismissed={true}
            />
        );
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("calls onSettingsSave when Save Changes is clicked", () => {
        const handleSave = vi.fn();
        render(
            <ClubDetailPageView
                {...defaultProps}
                activeTab="settings"
                onSettingsSave={handleSave}
            />
        );
        fireEvent.click(screen.getByText("Save Changes"));
        expect(handleSave).toHaveBeenCalled();
    });

    it("calls onSettingsCancel when Cancel is clicked", () => {
        const handleCancel = vi.fn();
        render(
            <ClubDetailPageView
                {...defaultProps}
                activeTab="settings"
                onSettingsCancel={handleCancel}
            />
        );
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleCancel).toHaveBeenCalled();
    });

    it("shows 'Saving…' on Save Changes button when updateSettingsIsPending", () => {
        render(
            <ClubDetailPageView
                {...defaultProps}
                activeTab="settings"
                updateSettingsIsPending={true}
            />
        );
        expect(screen.getByText("Saving…")).toBeInTheDocument();
    });
});
