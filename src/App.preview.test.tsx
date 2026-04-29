import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { FileItem } from "./components/file-types";

let selectionHandler: ((item: FileItem | null) => void) | undefined;
let togglePreviewHandler: (() => void) | undefined;
let requestAnimationFrameSpy: { mockRestore: () => void };
let cancelAnimationFrameSpy: { mockRestore: () => void };

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation(async (command: string) => {
    if (command === "get_app_data") {
      return {
        workspaces: [],
        tags: [],
        path_tags: {},
      };
    }
    return null;
  }),
}));

vi.mock("@tauri-apps/api/path", () => ({
  homeDir: vi.fn().mockResolvedValue("C:\\Users\\kenay\\OneDrive\\Desktop"),
  desktopDir: vi.fn().mockResolvedValue("C:\\Users\\kenay\\OneDrive\\Desktop"),
}));

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

vi.mock("./components/FileExplorer", async () => {
  const { useFilePaneContext } = await vi.importActual<typeof import("./components/FilePaneContext")>(
    "./components/FilePaneContext",
  );

  return {
    default: () => {
      const { onSelectionChange, onTogglePreview } = useFilePaneContext();
      selectionHandler = onSelectionChange;
      togglePreviewHandler = onTogglePreview;
      return <div>Explorer</div>;
    },
  };
});

vi.mock("./components/preview/PreviewPanel", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    default: ({
      open,
      selectedItem,
      payload,
    }: {
      open: boolean;
      selectedItem?: FileItem | null;
      payload: { content?: string } | null;
    }) => {
      const [shouldRender, setShouldRender] = React.useState(open);

      React.useEffect(() => {
        if (open) {
          setShouldRender(true);
        }
      }, [open]);

      if (!shouldRender) {
        return null;
      }

      return (
        <aside aria-label="Shared preview" onTransitionEnd={() => {
          if (!open) {
            setShouldRender(false);
          }
        }}>
          <div>Preview</div>
          {selectedItem ? <div>{selectedItem.name}</div> : null}
          {payload?.content ? <div>{payload.content}</div> : null}
        </aside>
      );
    },
  };
});

async function renderApp() {
  render(<App />);
  await screen.findByRole("button", { name: "Toggle dual-pane split view" });
}

describe("App preview panel", () => {
  beforeEach(() => {
    requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    cancelAnimationFrameSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it("starts with the file tree and preview panel closed", async () => {
    await renderApp();

    expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("keeps the app frame fixed while the file list owns vertical scrolling", async () => {
    await renderApp();

    expect(screen.getByTestId("app-content-frame")).toHaveClass("overflow-hidden");
    expect(screen.getByTestId("file-list-scroll-region")).toHaveClass("overflow-auto");
  });

  it("keeps the preview closed for the initial file selection", async () => {
    await renderApp();

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

  it("keeps the preview closed when a different file is selected before pressing Space", async () => {
    await renderApp();

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

  it("toggles the preview panel open and closed with Space for the selected file", async () => {
    await renderApp();
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
    // Content is now visible immediately without waiting for animation
    expect(screen.getByText("preview ready: report.pdf")).toBeInTheDocument();

    act(() => {
      togglePreviewHandler?.();
    });

    act(() => {
      fireEvent.transitionEnd(screen.getByText("Preview").closest("aside") as HTMLElement, {
        propertyName: "width",
      });
    });

    act(() => {
      selectionHandler?.(openedFile);
    });

    expect(screen.queryByText("Preview")).not.toBeInTheDocument();
  });

  it("keeps the preview open and updates it when another file is selected after Space opened it", async () => {
    await renderApp();
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
