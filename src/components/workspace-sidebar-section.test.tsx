import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceSidebarSection } from "./workspace-sidebar-section";

const defaultWorkspaces = [
  {
    id: "ws1",
    name: "Project Alpha",
    color: "#ff0000",
    paths: ["C:/projects/alpha/src", "C:/projects/alpha/docs"],
  },
  {
    id: "ws2",
    name: "Project Beta",
    color: null,
    paths: [],
  },
];

let mockWorkspaces = [...defaultWorkspaces];
const mockAddToWorkspace = vi.fn();
const mockDeleteWorkspace = vi.fn();

vi.mock("@/hooks/use-workspaces", () => ({
  useWorkspaces: () => ({
    workspaces: mockWorkspaces,
    tags: [],
    pathTags: {},
    isLoading: false,
    createWorkspace: vi.fn(),
    renameWorkspace: vi.fn(),
    deleteWorkspace: mockDeleteWorkspace,
    addToWorkspace: mockAddToWorkspace,
    removeFromWorkspace: vi.fn(),
    createTag: vi.fn(),
    renameTag: vi.fn(),
    changeTagColor: vi.fn(),
    deleteTag: vi.fn(),
    addTagToPath: vi.fn(),
    removeTagFromPath: vi.fn(),
  }),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ContextMenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button onClick={onSelect}>{children}</button>
  ),
}));

describe("WorkspaceSidebarSection", () => {
  const defaultProps = {
    activeWorkspaceId: null,
    onNavigate: vi.fn(),
    onOpenWorkspace: vi.fn(),
    onRenameWorkspace: vi.fn(),
    onCreateWorkspace: vi.fn(),
    onCreateWorkspaceFromPath: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaces = [...defaultWorkspaces];
  });

  it("renders the list of workspaces", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    expect(screen.getByText("Workspaces")).toBeInTheDocument();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("renders create affordance, item counts, and active workspace state", () => {
    render(<WorkspaceSidebarSection {...defaultProps} activeWorkspaceId="ws1" />);

    expect(screen.getByRole("button", { name: "Create workspace" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open workspace Project Alpha" })).toHaveAttribute("aria-current", "page");
  });

  it("opens a workspace when the workspace row is clicked", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Open workspace Project Alpha" }));

    expect(defaultProps.onOpenWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ws1", name: "Project Alpha" })
    );
    expect(screen.queryByText("src")).not.toBeInTheDocument();
  });

  it("expands paths only from the secondary expander", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand Project Alpha paths" }));

    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("calls onCreateWorkspace when the create button is clicked", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(defaultProps.onCreateWorkspace).toHaveBeenCalledWith();
  });

  it("adds a dropped path to an existing workspace and shows drag-over state", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    const row = screen
      .getByRole("button", { name: "Open workspace Project Alpha" })
      .closest("[data-workspace-drop-target]");
    const dataTransfer = {
      getData: vi.fn().mockReturnValue("C:/dropped/path"),
      dropEffect: "none",
    } as unknown as DataTransfer;

    fireEvent.dragOver(row!, { dataTransfer });
    expect(row).toHaveAttribute("data-drag-over", "true");

    fireEvent.drop(row!, { dataTransfer });

    expect(mockAddToWorkspace).toHaveBeenCalledWith("ws1", "C:/dropped/path");
  });

  it("calls onNavigate when a path is clicked", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Expand Project Alpha paths" }));
    fireEvent.click(screen.getByText("src"));

    expect(defaultProps.onNavigate).toHaveBeenCalledWith("C:/projects/alpha/src");
  });

  it("renders empty state when no workspaces exist", () => {
    mockWorkspaces = [];
    render(<WorkspaceSidebarSection {...defaultProps} />);

    expect(screen.getByText("Drop here to create new workspace")).toBeInTheDocument();
  });

  it("calls onRenameWorkspace when Rename is clicked", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    const renameButton = screen.getAllByText("Rename")[0];
    fireEvent.click(renameButton);

    expect(defaultProps.onRenameWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ws1", name: "Project Alpha" })
    );
  });
});
