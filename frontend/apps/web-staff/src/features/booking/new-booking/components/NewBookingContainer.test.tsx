import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewBookingContainer from "./NewBookingContainer";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("@tanstack/react-router", () => ({
    useNavigate: () => mockNavigate,
    useSearch: vi.fn(() => ({})),
}));

vi.mock("../../hooks", () => ({
    useCreateBooking: vi.fn(),
    useListCourts: vi.fn(),
    useGetCourtAvailability: vi.fn(),
}));

vi.mock("../../store", () => ({
    useClubAccess: vi.fn(),
}));

vi.mock("@repo/ui", () => ({
    Breadcrumb: ({ items }: { items: { label: string }[] }) => (
        <nav>
            {items.map((item) => (
                <span key={item.label}>{item.label}</span>
            ))}
        </nav>
    ),
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            <span>{title}</span>
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
    DatePicker: ({
        value,
        onChange,
        placeholder,
        disabled,
        className,
    }: {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
        disabled?: boolean;
        className?: string;
    }) => (
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={placeholder ?? "Pick a date"}
            disabled={disabled}
            className={className}
        />
    ),
    NumberInput: ({
        className,
        ...props
    }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
        <input type="number" className={className} {...props} />
    ),
    SelectInput: ({
        value,
        onValueChange,
        options,
        placeholder,
        clearLabel,
        disabled,
        className,
    }: {
        value: string;
        onValueChange: (v: string) => void;
        options: { value: string; label: string; disabled?: boolean }[];
        placeholder?: string;
        clearLabel?: string;
        disabled?: boolean;
        className?: string;
    }) => (
        <select
            value={value ?? ""}
            onChange={(e) => onValueChange(e.target.value)}
            aria-label={placeholder ?? "select"}
            disabled={disabled}
            className={className}
        >
            {clearLabel !== undefined ? <option value="">{clearLabel}</option> : null}
            {options.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
    datetimeLocalToUTC: (value: string) => value,
}));

import { useCreateBooking, useGetCourtAvailability, useListCourts } from "../../hooks";
import { useClubAccess } from "../../store";

const mockUseCreateBooking = useCreateBooking as ReturnType<typeof vi.fn>;
const mockUseListCourts = useListCourts as ReturnType<typeof vi.fn>;
const mockUseGetCourtAvailability = useGetCourtAvailability as ReturnType<typeof vi.fn>;
const mockUseClubAccess = useClubAccess as ReturnType<typeof vi.fn>;

function setupMocks(overrides?: { courts?: unknown[]; error?: Error | null; isPending?: boolean }) {
    mockUseClubAccess.mockReturnValue({ clubId: "club-1" });
    mockUseListCourts.mockReturnValue({
        data: overrides?.courts ?? [{ id: "court-1", name: "Court 1" }],
    });
    mockUseGetCourtAvailability.mockReturnValue({
        data: {
            slots: [{ start_time: "10:00", is_available: true, price_label: "EUR 20" }],
        },
        isLoading: false,
    });
    mockUseCreateBooking.mockReturnValue({
        mutate: mockMutate,
        reset: mockReset,
        isPending: overrides?.isPending ?? false,
        error: overrides?.error ?? null,
    });
}

describe("NewBookingContainer", () => {
    beforeEach(() => {
        setupMocks();
        mockNavigate.mockReset();
        mockMutate.mockReset();
        mockReset.mockReset();
    });

    it("shows validation errors and does not submit without required fields", async () => {
        setupMocks({ courts: [] });
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(screen.getByText("Court is required.")).toBeInTheDocument();
        expect(screen.getByText("Date and start time are required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("submits a valid payload and navigates on success", async () => {
        mockMutate.mockImplementation((payload, options) => {
            options.onSuccess();
        });

        render(<NewBookingContainer />);

        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: /select court/i })).toHaveValue("court-1");
        });

        fireEvent.change(screen.getByLabelText("Pick a date"), {
            target: { value: "2026-04-20" },
        });
        await waitFor(() => {
            expect(screen.getByRole("combobox", { name: "Select time" })).toBeInTheDocument();
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Select time" }), {
            target: { value: "10:00" },
        });
        fireEvent.change(screen.getByLabelText(/max players/i), { target: { value: "6" } });
        fireEvent.change(screen.getByLabelText(/event name/i), {
            target: { value: " Spring Cup " },
        });
        fireEvent.click(screen.getByRole("button", { name: "Create Booking" }));

        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                court_id: "court-1",
                booking_type: "regular",
                start_datetime: "2026-04-20T10:00",
                max_players: 6,
                event_name: "Spring Cup",
            }),
            expect.objectContaining({ onSuccess: expect.any(Function) })
        );
        expect(mockNavigate).toHaveBeenCalledWith({ to: "/bookings", search: { created: true } });
    });

    it("navigates back on cancel", () => {
        render(<NewBookingContainer />);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(mockNavigate).toHaveBeenCalledWith({ to: "/bookings" });
    });

    it("shows api error and resets it when dismissed", () => {
        setupMocks({ error: new Error("Create failed") });
        render(<NewBookingContainer />);

        expect(screen.getByRole("alert")).toHaveTextContent("Create failed");
        fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
        expect(mockReset).toHaveBeenCalled();
    });
});
