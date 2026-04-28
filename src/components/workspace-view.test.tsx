import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceView } from "./workspace-view";
import type { AppData } from "@/lib/workspace-provider";

const mockWorkspace = {
  id: "ws1",
  name: "Project Alpha",
  color: "#ff0000",
  paths: ["C:/projects/alpha/main.rs", "C:/projects/alpha/lib.rs"],
};

const mockTags = [
  { id: "tag1", name: "rust", color: "#dea584" },
  { id: "tag2", name: "backend", color: "#4caf50" },
];

const mockPathTags: AppData["path_tags"] = {
  "C:/projects/alpha/main.rs": ["tag1"],
  "C:/projects/alpha/lib.rs": ["tag1", "tag2"],
};

const mockRemoveFromWorkspace = vi.fn();
const mockAddToWorkspace = vi.fn();
const mockDeleteWorkspace = vi.fn();
const mockRenameWorkspace = vi.fn();

vi.mock("@/hooks/use-workspaces", () => ({
  useWorkspace: (id: string | null) => {
    return id === "ws1" ? mockWorkspace : null;
  },
  useWorkspaces: () => ({
    workspaces: [mockWorkspace],
    tags: mockTags,
    pathTags: mockPathTags,
    isLoading: false,
    createWorkspace: vi.fn(),
    renameWorkspace: mockRenameWorkspace,
    deleteWorkspace: mockDeleteWorkspace,
    addToWorkspace: mockAddToWorkspace,
    removeFromWorkspace: mockRemoveFromWorkspace,
    createTag: vi.fn(),
    renameTag: vi.fn(),
    changeTagColor: vi.fn(),
    deleteTag: vi.fn(),
    addTagToPath: vi.fn(),
    removeTagFromPath: vi.fn(),
  }),
}));

describe("WorkspaceView", () => {
  const defaultProps = {
    workspaceId: "ws1",
    onNavigate: vi.fn(),
    onTagClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders workspace items", () => {
    render(<WorkspaceView {...defaultProps} />);

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("main.rs")).toBeInTheDocument();
    expect(screen.getByText("lib.rs")).toBeInTheDocument();
  });

  it("shows workspace not found when workspace does not exist", () => {
    render(<WorkspaceView {...defaultProps} workspaceId="nonexistent" />);

    expect(screen.getByText("Workspace not found")).toBeInTheDocument();
  });

  it("calls onTagClick when a tag chip is clicked", () => {
    render(<WorkspaceView {...defaultProps} />);

    const tagButton = screen.getAllByText("rust").find((el) => el.tagName === "BUTTON");
    expect(tagButton).toBeDefined();
    fireEvent.click(tagButton!);

    expect(defaultProps.onTagClick).toHaveBeenCalledWith("tag1");
  });

  it("calls onNavigate when an item is clicked", () => {
    render(<WorkspaceView {...defaultProps} />);

    fireEvent.click(screen.getByText("main.rs"));

    expect(defaultProps.onNavigate).toHaveBeenCalledWith("C:/projects/alpha/main.rs");
  });

  it("renders tags associated with workspace paths", () => {
    render(<WorkspaceView {...defaultProps} />);

    expect(screen.getAllByText("rust").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("backend").length).toBeGreaterThanOrEqual(1);
  });

  it("renders workspace hub metadata and visible actions", () => {
    render(
      <WorkspaceView
        {...defaultProps}
        currentPath="C:/projects/alpha"
        selectedItemPath="C:/projects/alpha/main.rs"
        onRenameWorkspace={vi.fn()}
        onDeleteWorkspace={vi.fn()}
        onChangeWorkspaceColor={vi.fn()}
      />
    );

    expect(screen.getByText("2 paths")).toBeInTheDocument();
    expect(screen.getByText("2 tags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add current folder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add selected item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rename workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete workspace" })).toBeInTheDocument();
  });

  it("groups paths by parent folder", () => {
    render(<WorkspaceView {...defaultProps} />);

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("main.rs")).toBeInTheDocument();
    expect(screen.getByText("lib.rs")).toBeInTheDocument();
  });

  it("removes a path from the workspace", () => {
    render(<WorkspaceView {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove main.rs from workspace" }));

    expect(mockRemoveFromWorkspace).toHaveBeenCalledWith("ws1", "C:/projects/alpha/main.rs");
  });

  it("adds the current folder and selected item from visible actions", () => {
    render(
      <WorkspaceView
        {...defaultProps}
        currentPath="C:/projects/alpha"
        selectedItemPath="C:/projects/alpha/main.rs"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add current folder" }));
    fireEvent.click(screen.getByRole("button", { name: "Add selected item" }));

    expect(mockAddToWorkspace).toHaveBeenCalledWith("ws1", "C:/projects/alpha");
    expect(mockAddToWorkspace).toHaveBeenCalledWith("ws1", "C:/projects/alpha/main.rs");
  });

  it("shows a recovery action when the workspace is missing", () => {
    const onBackToFiles = vi.fn();

    render(
      <WorkspaceView
        {...defaultProps}
        workspaceId="nonexistent"
        currentPath="C:/projects/alpha"
        onBackToFiles={onBackToFiles}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to current folder" }));

    expect(onBackToFiles).toHaveBeenCalledWith("C:/projects/alpha");
  });
});
