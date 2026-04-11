import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CourtModal from "./CourtModal";
import type { Court } from "../types";

const mockMutate = vi.fn();
const mockReset = vi.fn();

vi.mock("../hooks", () => ({
    useCreateCourt: () => ({
        mutate: mockMutate,
        isPending: false,
        error: null,
        reset: mockReset,
    }),
    useUpdateCourt: () => ({
        mutate: mockMutate,
        isPending: false,
        error: null,
        reset: mockReset,
    }),
}));

vi.mock("@repo/ui", () => ({
    AlertToast: ({ title, onClose }: { title: string; onClose: () => void }) => (
        <div role="alert">
            {title}
            <button onClick={onClose}>Dismiss</button>
        </div>
    ),
}));

const existingCourt: Court = {
    id: "court-1",
    club_id: "club-1",
    name: "Court Alpha",
    surface_type: "indoor",
    has_lighting: true,
    lighting_surcharge: 5,
    is_active: true,
};

const defaultProps = {
    clubId: "club-1",
    onClose: vi.fn(),
    onSuccess: vi.fn(),
};

beforeEach(() => {
    mockMutate.mockReset();
    mockReset.mockReset();
});

describe("CourtModal — create mode", () => {
    it("renders 'Create a court' title", () => {
        render(<CourtModal {...defaultProps} />);
        expect(screen.getByText("Create a court")).toBeInTheDocument();
    });

    it("does not render Active checkbox in create mode", () => {
        render(<CourtModal {...defaultProps} />);
        expect(screen.queryByLabelText("Active")).not.toBeInTheDocument();
    });

    it("prevents submit when name is empty and shows validation error", () => {
        render(<CourtModal {...defaultProps} />);
        fireEvent.click(screen.getByText("Create Court"));
        expect(screen.getByText("Court name is required.")).toBeInTheDocument();
        expect(mockMutate).not.toHaveBeenCalled();
    });

    it("calls createCourt.mutate with correct payload on submit", () => {
        render(<CourtModal {...defaultProps} />);
        fireEvent.change(screen.getByLabelText("Court Name *"), {
            target: { value: "Court 1" },
        });
        fireEvent.click(screen.getByText("Create Court"));
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                club_id: "club-1",
                name: "Court 1",
            }),
            expect.any(Object)
        );
    });

    it("calls onClose when Cancel is clicked", () => {
        const handleClose = vi.fn();
        render(<CourtModal {...defaultProps} onClose={handleClose} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleClose).toHaveBeenCalled();
    });
});

describe("CourtModal — edit mode", () => {
    it("renders 'Edit court' title", () => {
        render(<CourtModal {...defaultProps} initialData={existingCourt} />);
        expect(screen.getByText("Edit court")).toBeInTheDocument();
    });

    it("renders Active checkbox checked when court is active", () => {
        render(<CourtModal {...defaultProps} initialData={existingCourt} />);
        const checkbox = screen.getByLabelText("Active") as HTMLInputElement;
        expect(checkbox).toBeInTheDocument();
        expect(checkbox.checked).toBe(true);
    });

    it("renders Active checkbox unchecked when court is inactive", () => {
        render(
            <CourtModal {...defaultProps} initialData={{ ...existingCourt, is_active: false }} />
        );
        const checkbox = screen.getByLabelText("Active") as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
    });

    it("toggles is_active to false when unchecked and submits correct payload", () => {
        render(<CourtModal {...defaultProps} initialData={existingCourt} />);
        const checkbox = screen.getByLabelText("Active");
        fireEvent.click(checkbox); // uncheck → false
        fireEvent.click(screen.getByText("Update Court"));
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({ is_active: false }),
            expect.any(Object)
        );
    });

    it("toggles is_active to true when checked and submits correct payload", () => {
        render(
            <CourtModal {...defaultProps} initialData={{ ...existingCourt, is_active: false }} />
        );
        const checkbox = screen.getByLabelText("Active");
        fireEvent.click(checkbox); // check → true
        fireEvent.click(screen.getByText("Update Court"));
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({ is_active: true }),
            expect.any(Object)
        );
    });

    it("submits full payload with is_active on update", () => {
        render(<CourtModal {...defaultProps} initialData={existingCourt} />);
        fireEvent.click(screen.getByText("Update Court"));
        expect(mockMutate).toHaveBeenCalledWith(
            {
                name: "Court Alpha",
                surface_type: "indoor",
                has_lighting: true,
                lighting_surcharge: 5,
                is_active: true,
            },
            expect.any(Object)
        );
    });

    it("calls onClose when Cancel is clicked", () => {
        const handleClose = vi.fn();
        render(<CourtModal {...defaultProps} onClose={handleClose} initialData={existingCourt} />);
        fireEvent.click(screen.getByText("Cancel"));
        expect(handleClose).toHaveBeenCalled();
    });
});
