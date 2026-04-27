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
    onNavigate: vi.fn(),
    onOpenWorkspace: vi.fn(),
    onRenameWorkspace: vi.fn(),
    onCreateWorkspace: vi.fn(),
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

  it("expands a workspace and shows its paths when clicked", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    expect(screen.queryByText("src")).not.toBeInTheDocument();

    const workspaceButton = screen.getByText("Project Alpha");
    fireEvent.click(workspaceButton);

    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("docs")).toBeInTheDocument();
  });

  it("calls onNavigate when a path is clicked", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    fireEvent.click(screen.getByText("Project Alpha"));
    fireEvent.click(screen.getByText("src"));

    expect(defaultProps.onNavigate).toHaveBeenCalledWith("C:/projects/alpha/src");
  });

  it("simulates drop of a path on a workspace", () => {
    render(<WorkspaceSidebarSection {...defaultProps} />);

    const workspaceRow = screen.getByText("Project Alpha").closest("button")?.parentElement;

    const dataTransfer = {
      getData: vi.fn().mockReturnValue("C:/dropped/path"),
      dropEffect: "none",
    } as unknown as DataTransfer;

    fireEvent.drop(workspaceRow!, { dataTransfer });

    expect(mockAddToWorkspace).toHaveBeenCalledWith("ws1", "C:/dropped/path");
  });

  it("renders empty state when no workspaces exist", () => {
    mockWorkspaces = [];
    render(<WorkspaceSidebarSection {...defaultProps} />);

    expect(screen.getByText("Drop here to create new workspace")).toBeInTheDocument();
  });
});
