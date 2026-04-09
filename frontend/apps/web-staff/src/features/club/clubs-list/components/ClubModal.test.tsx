import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ClubModal from "../../components/ClubModal";

const mockCreateMutate = vi.hoisted(() => vi.fn());
const mockUpdateMutate = vi.hoisted(() => vi.fn());

vi.mock("../../hooks", () => ({
    useCreateClub: () => ({ mutate: mockCreateMutate, isPending: false, error: null, reset: vi.fn() }),
    useUpdateClub: () => ({ mutate: mockUpdateMutate, isPending: false, error: null, reset: vi.fn() }),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title }: { title: string }) => <div role="alert">{title}</div>,
}));

describe("ClubModal — create mode", () => {
    beforeEach(() => {
        mockCreateMutate.mockReset();
    });

    it("renders create title", () => {
        render(<ClubModal onClose={vi.fn()} />);
        expect(screen.getByText("Create a club")).toBeInTheDocument();
    });

    it("shows validation error when submitting without a name", () => {
        render(<ClubModal onClose={vi.fn()} />);
        fireEvent.click(screen.getByText("Create Club"));
        expect(screen.getByText("Club name is required.")).toBeInTheDocument();
        expect(mockCreateMutate).not.toHaveBeenCalled();
    });

    it("calls createClub with trimmed payload on valid submit", () => {
        render(<ClubModal onClose={vi.fn()} />);
        fireEvent.change(screen.getByLabelText(/Club Name/), {
            target: { value: "  My Club  " },
        });
        fireEvent.click(screen.getByText("Create Club"));
        expect(mockCreateMutate).toHaveBeenCalledWith(
            expect.objectContaining({ name: "My Club" }),
            expect.any(Object)
        );
    });

    it("calls onClose when Cancel is clicked", () => {
        const handleClose = vi.fn();
        render(<ClubModal onClose={handleClose} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleClose).toHaveBeenCalled();
    });
});

describe("ClubModal — edit mode", () => {
    const initialClub = { id: "1", name: "Old Club", address: "1 St", currency: "EUR" };

    beforeEach(() => {
        mockUpdateMutate.mockReset();
    });

    it("renders edit title", () => {
        render(<ClubModal onClose={vi.fn()} initialData={initialClub as never} />);
        expect(screen.getByText("Update club details")).toBeInTheDocument();
    });

    it("pre-fills form with initial data", () => {
        render(<ClubModal onClose={vi.fn()} initialData={initialClub as never} />);
        expect(screen.getByDisplayValue("Old Club")).toBeInTheDocument();
        expect(screen.getByDisplayValue("1 St")).toBeInTheDocument();
        expect(screen.getByDisplayValue("EUR")).toBeInTheDocument();
    });

    it("calls updateClub with updated payload", () => {
        render(<ClubModal onClose={vi.fn()} initialData={initialClub as never} />);
        fireEvent.change(screen.getByLabelText(/Club Name/), {
            target: { value: "New Name" },
        });
        fireEvent.click(screen.getByText("Update Club"));
        expect(mockUpdateMutate).toHaveBeenCalledWith(
            expect.objectContaining({ name: "New Name" }),
            expect.any(Object)
        );
    });
});
