import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CreateWorkspaceDialog } from "./create-workspace-dialog";

const mockCreateWorkspace = vi.fn();

vi.mock("@/hooks/use-workspaces", () => ({
  useWorkspaces: () => ({
    workspaces: [],
    createWorkspace: mockCreateWorkspace,
  }),
}));

describe("CreateWorkspaceDialog - rename mode", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    initialName: "Old Name",
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in rename mode when onSubmit is provided", () => {
    render(<CreateWorkspaceDialog {...defaultProps} />);

    expect(screen.getByText("Rename Workspace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Old Name")).toBeInTheDocument();
  });

  it("calls onSubmit with trimmed name and closes dialog on submit", async () => {
    const onOpenChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <CreateWorkspaceDialog
        {...defaultProps}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText("Workspace name");
    fireEvent.change(input, { target: { value: "New Name" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith("New Name");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("does not submit when name is empty", () => {
    const onSubmit = vi.fn();

    render(
      <CreateWorkspaceDialog
        {...defaultProps}
        initialName=""
        onSubmit={onSubmit}
      />
    );

    const form = screen.getByPlaceholderText("Workspace name").closest("form")!;
    fireEvent.submit(form);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
