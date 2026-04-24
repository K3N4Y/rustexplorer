import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { FileItem } from "./components/file-types";

let selectionHandler: ((item: FileItem | null) => void) | undefined;
let togglePreviewHandler: (() => void) | undefined;

vi.mock("./hooks/use-file-navigation", () => ({
  useFileNavigation: () => ({
    canGoBack: false,
    canGoForward: false,
    canGoUp: false,
    currentPath: "C:\\Users\\kenay\\OneDrive\\Desktop",
    deleteItem: vi.fn(),
    errorMessage: null,
    files: [],
    history: [],
    historyIndex: 0,
    isLoading: false,
    loadFolder: vi.fn().mockResolvedValue([]),
    navigateToPath: vi.fn(),
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
    payload: previewOpen
      ? {
          type: "text",
          content: `preview ready: ${selectedItem?.name ?? "none"}`,
          truncated: false,
          sizeBytes: 13,
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

vi.mock("./components/FileExplorer", () => ({
  default: ({
    onSelectionChange,
    onTogglePreview,
  }: {
    onSelectionChange: (item: FileItem | null) => void;
    onTogglePreview: () => void;
  }) => {
    selectionHandler = onSelectionChange;
    togglePreviewHandler = onTogglePreview;
    return <div>Explorer</div>;
  },
}));

describe("App preview panel", () => {
  it("starts with the file tree and preview panel closed", () => {
    render(<App />);

    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("keeps the app frame fixed while the file list owns vertical scrolling", () => {
    render(<App />);

    expect(screen.getByTestId("app-content-frame")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("file-list-scroll-region")).toHaveClass("overflow-auto");
  });

  it("keeps the preview closed for the initial file selection", () => {
    render(<App />);

    act(() => {
      selectionHandler?.({
        name: "report.pdf",
        path: "C:\\Users\\kenay\\OneDrive\\Desktop\\report.pdf",
        size: 10,
        modified: null,
        isDirectory: false,
      });
    });

    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("keeps the preview closed when a different file is selected before pressing Space", () => {
    render(<App />);

    act(() => {
      selectionHandler?.({
        name: "report.pdf",
        path: "C:\\Users\\kenay\\OneDrive\\Desktop\\report.pdf",
        size: 10,
        modified: null,
        isDirectory: false,
      });
    });

    act(() => {
      selectionHandler?.({
        name: "photo.png",
        path: "C:\\Users\\kenay\\OneDrive\\Desktop\\photo.png",
        size: 10,
        modified: null,
        isDirectory: false,
      });
    });

    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("toggles the preview panel open and closed with Space for the selected file", () => {
    render(<App />);
    const selectedFile = {
      name: "report.pdf",
      path: "C:\\Users\\kenay\\OneDrive\\Desktop\\report.pdf",
      size: 10,
      modified: null,
      isDirectory: false,
    };
    const openedFile = {
      ...selectedFile,
      name: "photo.png",
      path: "C:\\Users\\kenay\\OneDrive\\Desktop\\photo.png",
    };

    act(() => {
      selectionHandler?.(selectedFile);
    });

    expect(screen.queryByText("Preview")).not.toBeInTheDocument();

    act(() => {
      togglePreviewHandler?.();
    });

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("preview ready: report.pdf")).toBeInTheDocument();

    act(() => {
      togglePreviewHandler?.();
    });

    act(() => {
      selectionHandler?.(openedFile);
    });

    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("keeps the preview open and updates it when another file is selected after Space opened it", () => {
    render(<App />);
    const selectedFile = {
      name: "report.pdf",
      path: "C:\\Users\\kenay\\OneDrive\\Desktop\\report.pdf",
      size: 10,
      modified: null,
      isDirectory: false,
    };
    const nextFile = {
      ...selectedFile,
      name: "photo.png",
      path: "C:\\Users\\kenay\\OneDrive\\Desktop\\photo.png",
    };

    act(() => {
      selectionHandler?.(selectedFile);
    });

    act(() => {
      togglePreviewHandler?.();
    });

    expect(screen.getByText("preview ready: report.pdf")).toBeInTheDocument();

    act(() => {
      selectionHandler?.(nextFile);
    });

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("preview ready: photo.png")).toBeInTheDocument();
  });
});
