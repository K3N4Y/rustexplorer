import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { FileItem } from "./components/file-types";

import type { PaneId } from './types/pane';

type FileExplorerMockProps = {
  paneId?: PaneId;
  paneLabel?: string;
  isSearchActive?: boolean;
  isActivePane?: boolean;
  selectedIndex?: number;
  onActivatePane?: (paneId: PaneId) => void;
  onSelectionChange?: (item: FileItem | null) => void;
  onTogglePreview?: () => void;
  onCopyToInactivePane?: (item: FileItem) => void;
  onMoveToInactivePane?: (item: FileItem) => void;
};

const navigationMock = vi.hoisted(() => {
  const desktopRoot = "C:\\Users\\kenay\\OneDrive\\Desktop";
  const alphaFile = {
    name: "alpha.txt",
    path: `${desktopRoot}\\alpha.txt`,
    size: 10,
    modified: null,
    isDirectory: false,
  };
  const betaFile = {
    name: "beta.txt",
    path: `${desktopRoot}\\beta.txt`,
    size: 20,
    modified: null,
    isDirectory: false,
  };
  const createPane = () => ({
    canGoBack: false,
    canGoForward: false,
    canGoUp: false,
    copyItemToDirectory: vi.fn().mockResolvedValue(undefined),
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
    moveItemToDirectory: vi.fn().mockResolvedValue(undefined),
    resetToInitialPath: vi.fn().mockResolvedValue(undefined),
    renameItem: vi.fn(),
    setCurrentPath: vi.fn(),
    setFiles: vi.fn(),
    setHistoryIndex: vi.fn(),
  });

  return {
    alphaFile,
    betaFile,
    callCount: 0,
    desktopRoot,
    leftPane: createPane(),
    rightPane: createPane(),
  };
});

const desktopRoot = navigationMock.desktopRoot;

const alphaFile = navigationMock.alphaFile as FileItem;
const betaFile = navigationMock.betaFile as FileItem;

vi.mock("./hooks/use-file-navigation", () => ({
  useFileNavigation: () => {
    const pane = navigationMock.callCount % 2 === 0 ? navigationMock.leftPane : navigationMock.rightPane;
    navigationMock.callCount += 1;
    return pane;
  },
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
  InputGroupDemo: ({
    onSearchStateChange,
  }: {
    onSearchStateChange: (isActive: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSearchStateChange(true)}>
        Start search
      </button>
      <button type="button" onClick={() => onSearchStateChange(false)}>
        Clear search
      </button>
    </div>
  ),
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
    isSearchActive,
    isActivePane,
    selectedIndex,
    onActivatePane,
    onSelectionChange,
    onTogglePreview,
    onCopyToInactivePane,
    onMoveToInactivePane,
  }: FileExplorerMockProps) => (
    <section
      aria-label={paneLabel}
      data-active={String(isActivePane)}
      data-search-active={String(isSearchActive)}
      data-selected-index={selectedIndex}
    >
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
      {onCopyToInactivePane ? (
        <button type="button" onClick={() => onCopyToInactivePane(paneId === "left" ? alphaFile : betaFile)}>
          Copy to inactive pane {paneId}
        </button>
      ) : null}
      {onMoveToInactivePane ? (
        <button type="button" onClick={() => onMoveToInactivePane(paneId === "left" ? alphaFile : betaFile)}>
          Move to inactive pane {paneId}
        </button>
      ) : null}
    </section>
  ),
}));

describe("App dual-pane lifecycle", () => {
  beforeEach(() => {
    navigationMock.callCount = 0;
    for (const pane of [navigationMock.leftPane, navigationMock.rightPane]) {
      pane.copyItemToDirectory.mockClear();
      pane.deleteItem.mockClear();
      pane.loadFolder.mockClear();
      pane.moveItemToDirectory.mockClear();
      pane.navigateToPath.mockClear();
      pane.resetToInitialPath.mockClear();
      pane.renameItem.mockClear();
      pane.setCurrentPath.mockClear();
      pane.setFiles.mockClear();
      pane.setHistoryIndex.mockClear();
    }
  });

  it("renders single-pane by default", () => {
    render(<App />);

    expect(screen.getByLabelText("Left file pane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Right file pane")).not.toBeInTheDocument();
    expect(screen.getByTestId("pane-grid")).toHaveClass("single-pane-grid");
  });

  it("does not expose inactive-pane transfer actions in single-pane mode", () => {
    render(<App />);

    const leftPane = screen.getByLabelText("Left file pane");

    expect(within(leftPane).queryByRole("button", { name: "Copy to inactive pane left" })).not.toBeInTheDocument();
    expect(within(leftPane).queryByRole("button", { name: "Move to inactive pane left" })).not.toBeInTheDocument();
  });

  it("exposes inactive-pane transfer actions in dual-pane mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));

    const leftPane = screen.getByLabelText("Left file pane");
    const rightPane = screen.getByLabelText("Right file pane");

    expect(within(leftPane).getByRole("button", { name: "Copy to inactive pane left" })).toBeInTheDocument();
    expect(within(leftPane).getByRole("button", { name: "Move to inactive pane left" })).toBeInTheDocument();
    expect(within(rightPane).getByRole("button", { name: "Copy to inactive pane right" })).toBeInTheDocument();
    expect(within(rightPane).getByRole("button", { name: "Move to inactive pane right" })).toBeInTheDocument();
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

  it("resets the hidden right pane before dual pane is re-enabled", () => {
    render(<App />);

    const toggle = screen.getByRole("button", { name: "Toggle dual-pane split view" });
    fireEvent.click(toggle);
    const resetsAfterInitialEnable = navigationMock.rightPane.resetToInitialPath.mock.calls.length;
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(navigationMock.rightPane.resetToInitialPath).toHaveBeenCalledTimes(resetsAfterInitialEnable + 1);
  });

  it("marks search active only on the active pane", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));
    fireEvent.click(screen.getByRole("button", { name: "Start search" }));

    expect(screen.getByLabelText("Left file pane")).toHaveAttribute("data-search-active", "true");
    expect(screen.getByLabelText("Right file pane")).toHaveAttribute("data-search-active", "false");

    fireEvent.click(within(screen.getByLabelText("Right file pane")).getByRole("button", { name: "Activate right" }));

    expect(screen.getByLabelText("Left file pane")).toHaveAttribute("data-search-active", "false");
    expect(screen.getByLabelText("Right file pane")).toHaveAttribute("data-search-active", "false");
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

  it("copies the active selection to the inactive pane with F5", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));
    const leftPane = screen.getByLabelText("Left file pane");

    act(() => {
      within(leftPane).getByRole("button", { name: "Select left" }).click();
    });
    fireEvent.keyDown(window, { key: "F5" });

    await waitFor(() => {
      expect(navigationMock.rightPane.copyItemToDirectory).toHaveBeenCalledWith(alphaFile, desktopRoot);
    });
    expect(navigationMock.rightPane.navigateToPath).toHaveBeenCalledWith(desktopRoot, { recordHistory: false });
    expect(navigationMock.leftPane.moveItemToDirectory).not.toHaveBeenCalled();
  });

  it("moves the active selection to the inactive pane with F6", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));
    const leftPane = screen.getByLabelText("Left file pane");

    act(() => {
      within(leftPane).getByRole("button", { name: "Select left" }).click();
    });
    fireEvent.keyDown(window, { key: "F6" });

    await waitFor(() => {
      expect(navigationMock.rightPane.moveItemToDirectory).toHaveBeenCalledWith(alphaFile, desktopRoot);
    });
    expect(navigationMock.leftPane.navigateToPath).toHaveBeenCalledWith(desktopRoot, { recordHistory: false });
    expect(navigationMock.rightPane.navigateToPath).toHaveBeenCalledWith(desktopRoot, { recordHistory: false });
  });

  it("copies from the internal clipboard after switching panes", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));
    const leftPane = screen.getByLabelText("Left file pane");
    const rightPane = screen.getByLabelText("Right file pane");

    act(() => {
      within(leftPane).getByRole("button", { name: "Select left" }).click();
    });
    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.click(within(rightPane).getByRole("button", { name: "Activate right" }));
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    await waitFor(() => {
      expect(navigationMock.rightPane.copyItemToDirectory).toHaveBeenCalledWith(alphaFile, desktopRoot);
    });
    expect(navigationMock.rightPane.navigateToPath).toHaveBeenCalledWith(desktopRoot, { recordHistory: false });
  });

  it("does not render cross-pane drag-and-drop UI", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle dual-pane split view" }));

    expect(screen.queryByText(/drop files here/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("cross-pane-drop-zone")).not.toBeInTheDocument();
  });
});
