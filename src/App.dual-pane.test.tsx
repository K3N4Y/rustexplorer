import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { FileItem } from "./components/file-types";

type PaneId = "left" | "right";

type FileExplorerMockProps = {
  paneId?: PaneId;
  paneLabel?: string;
  isActivePane?: boolean;
  selectedIndex?: number;
  onActivatePane?: (paneId: PaneId) => void;
  onSelectionChange?: (item: FileItem | null) => void;
  onTogglePreview?: () => void;
};

const desktopRoot = "C:\\Users\\kenay\\OneDrive\\Desktop";

const alphaFile: FileItem = {
  name: "alpha.txt",
  path: `${desktopRoot}\\alpha.txt`,
  size: 10,
  modified: null,
  isDirectory: false,
};

const betaFile: FileItem = {
  name: "beta.txt",
  path: `${desktopRoot}\\beta.txt`,
  size: 20,
  modified: null,
  isDirectory: false,
};

vi.mock("./hooks/use-file-navigation", () => ({
  useFileNavigation: () => ({
    canGoBack: false,
    canGoForward: false,
    canGoUp: false,
    currentPath: desktopRoot,
    deleteItem: vi.fn(),
    errorMessage: null,
    files: [alphaFile, betaFile],
    history: [desktopRoot],
    historyIndex: 0,
    isLoading: false,
    loadFolder: vi.fn().mockResolvedValue([alphaFile, betaFile]),
    navigateToPath: vi.fn().mockResolvedValue(undefined),
    parentPath: "C:\\Users\\kenay\\OneDrive",
    renameItem: vi.fn(),
    setCurrentPath: vi.fn(),
    setFiles: vi.fn(),
    setHistoryIndex: vi.fn(),
  }),
}));

vi.mock("./hooks/usePreview", () => ({
  usePreview: ({
    previewOpen,
    selectedItem,
  }: {
    previewOpen: boolean;
    selectedItem: FileItem | null;
  }) => ({
    payload:
      previewOpen && selectedItem
        ? {
            type: "text",
            content: `preview ready: ${selectedItem.name}`,
            truncated: false,
            sizeBytes: selectedItem.size,
          }
        : null,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("./components/FileTreeSidebar", () => ({
  default: () => null,
}));

vi.mock("./components/SearchBar", () => ({
  InputGroupDemo: () => null,
}));

vi.mock("./components/settings-dialog", () => ({
  SettingsDialog: () => null,
}));

vi.mock("./components/preview/PreviewPanel", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({
      open,
      selectedName,
      payload,
      onContentReadyChange,
    }: {
      open: boolean;
      selectedName?: string;
      payload: { content?: string } | null;
      onContentReadyChange: (ready: boolean) => void;
    }) => {
      React.useEffect(() => {
        if (open) {
          onContentReadyChange(true);
        }
      }, [onContentReadyChange, open]);

      return open ? (
        <aside aria-label="Shared preview">
          <div>Preview: {selectedName ?? "none"}</div>
          {payload?.content ? <div>{payload.content}</div> : null}
        </aside>
      ) : null;
    },
  };
});

vi.mock("./components/FileExplorer", () => ({
  default: ({
    paneId = "left",
    paneLabel = "File explorer",
    isActivePane,
    selectedIndex,
    onActivatePane,
    onSelectionChange,
    onTogglePreview,
  }: FileExplorerMockProps) => (
    <section aria-label={paneLabel} data-active={String(isActivePane)} data-selected-index={selectedIndex}>
      <div>Pane: {paneId}</div>
      <button type="button" onClick={() => onActivatePane?.(paneId)}>
        Activate {paneId}
      </button>
      <button type="button" onClick={() => onSelectionChange?.(paneId === "left" ? alphaFile : betaFile)}>
        Select {paneId}
      </button>
      <button type="button" onClick={() => onTogglePreview?.()}>
        Toggle preview {paneId}
      </button>
    </section>
  ),
}));

describe("App dual-pane lifecycle", () => {
  it("renders single-pane by default", () => {
    render(<App />);

    expect(screen.getByLabelText("Left file pane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Right file pane")).not.toBeInTheDocument();
    expect(screen.getByTestId("pane-grid")).toHaveClass("single-pane-grid");
  });

  it("toggles the right pane at the desktop root", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));

    expect(screen.getByLabelText("Left file pane")).toBeInTheDocument();
    expect(screen.getByLabelText("Right file pane")).toBeInTheDocument();
    expect(screen.getByTestId("pane-grid")).toHaveClass("split-view-grid");
  });

  it("removes the right pane when dual pane is disabled", () => {
    render(<App />);

    const toggle = screen.getByRole("button", { name: "Toggle dual-pane split view" });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(screen.getByLabelText("Left file pane")).toHaveAttribute("data-active", "true");
    expect(screen.queryByLabelText("Right file pane")).not.toBeInTheDocument();
    expect(screen.getByTestId("pane-grid")).toHaveClass("single-pane-grid");
  });

  it("uses the active pane selection for the shared preview", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));

    const leftPane = screen.getByLabelText("Left file pane");
    const rightPane = screen.getByLabelText("Right file pane");

    act(() => {
      within(leftPane).getByRole("button", { name: "Select left" }).click();
    });
    fireEvent.click(within(leftPane).getByRole("button", { name: "Toggle preview left" }));

    expect(screen.getByText("Preview: alpha.txt")).toBeInTheDocument();

    act(() => {
      within(rightPane).getByRole("button", { name: "Select right" }).click();
    });

    expect(screen.getByText("Preview: alpha.txt")).toBeInTheDocument();

    fireEvent.click(within(rightPane).getByRole("button", { name: "Activate right" }));

    expect(screen.getByText("Preview: beta.txt")).toBeInTheDocument();
  });
});
