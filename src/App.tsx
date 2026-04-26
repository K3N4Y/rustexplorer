import { InputGroupDemo } from "./components/SearchBar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  Columns2,
  FolderOpen,
  RefreshCcw,
} from "lucide-react";
import "./App.css";
import FileExplorer from "./components/FileExplorer";
import FileTreeSidebar from "./components/FileTreeSidebar";
import type { FileItem } from "./components/file-types";
import { useFileNavigation } from "./hooks/use-file-navigation";
import { getPathLabel } from "./lib/path-utils";
import { Button } from "./components/ui/button";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { SettingsDialog } from "./components/settings-dialog";
import PreviewPanel from "./components/preview/PreviewPanel";
import { usePreview } from "./hooks/usePreview";

type PaneId = "left" | "right";
type TransferMode = "copy" | "move";
type ViewMode = "list" | "grid";
type SortOption = "name" | "modified" | "type" | "size";
type SortOrder = "asc" | "desc";

type PaneUiState = {
  selectedItem: FileItem | null;
  selectedIndex: number;
  viewMode: ViewMode;
  sortBy: SortOption;
  sortOrder: SortOrder;
};

type InternalClipboard = {
  item: FileItem;
  mode: TransferMode;
  sourcePane: PaneId;
} | null;

const createDefaultPaneUiState = (): PaneUiState => ({
  selectedItem: null,
  selectedIndex: 0,
  viewMode: "list",
  sortBy: "name",
  sortOrder: "asc",
});

function App() {
  const rootPath = "C:\\Users\\kenay\\OneDrive\\Desktop";
  const [searchActivePane, setSearchActivePane] = useState<PaneId | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContentReady, setPreviewContentReady] = useState(false);
  const [dualMode, setDualMode] = useState(false);
  const [activePane, setActivePane] = useState<PaneId>("left");
  const [paneUi, setPaneUi] = useState<Record<PaneId, PaneUiState>>({
    left: createDefaultPaneUiState(),
    right: createDefaultPaneUiState(),
  });
  const [internalClipboard, setInternalClipboard] = useState<InternalClipboard>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const leftPane = useFileNavigation(rootPath);
  const rightPane = useFileNavigation(rootPath);
  const activePaneState = activePane === "left" ? leftPane : rightPane;
  const {
    canGoBack,
    canGoForward,
    canGoUp,
    currentPath,
    history,
    historyIndex,
    isLoading,
    loadFolder,
    navigateToPath,
    parentPath,
    setFiles,
    setHistoryIndex,
  } = activePaneState;

  const handleGoBack = useCallback(async () => {
    if (!canGoBack) return;
    const nextIndex = historyIndex - 1;
    await navigateToPath(history[nextIndex], { recordHistory: false });
    setHistoryIndex(nextIndex);
  }, [canGoBack, history, historyIndex, navigateToPath, setHistoryIndex]);

  const handleGoForward = useCallback(async () => {
    if (!canGoForward) return;
    const nextIndex = historyIndex + 1;
    await navigateToPath(history[nextIndex], { recordHistory: false });
    setHistoryIndex(nextIndex);
  }, [canGoForward, history, historyIndex, navigateToPath, setHistoryIndex]);

  const handleGoUp = useCallback(async () => {
    if (!canGoUp) return;
    await navigateToPath(parentPath);
  }, [canGoUp, navigateToPath, parentPath]);

  const refreshPane = useCallback(
    async (paneId: PaneId) => {
      const pane = paneId === "left" ? leftPane : rightPane;
      await pane.navigateToPath(pane.currentPath, { recordHistory: false });
    },
    [leftPane, rightPane],
  );

  const handleRefresh = useCallback(async () => {
    await refreshPane(activePane);
  }, [activePane, refreshPane]);

  useEffect(() => {
    setPaneUi((current) => ({
      ...current,
      left: { ...current.left, selectedItem: null, selectedIndex: 0 },
    }));
  }, [leftPane.currentPath]);

  useEffect(() => {
    setPaneUi((current) => ({
      ...current,
      right: { ...current.right, selectedItem: null, selectedIndex: 0 },
    }));
  }, [rightPane.currentPath]);

  const selectedPreviewItem = paneUi[activePane].selectedItem;

  const {
    payload,
    isLoading: isPreviewLoading,
    error: previewError,
  } = usePreview({
    selectedItem: selectedPreviewItem,
    previewOpen: previewOpen && previewContentReady,
  });

  const handleSelectionChange = useCallback((paneId: PaneId, item: FileItem | null) => {
    setPaneUi((current) =>
      current[paneId].selectedItem === item
        ? current
        : {
            ...current,
            [paneId]: { ...current[paneId], selectedItem: item },
          },
    );
  }, []);

  const handleSelectedIndexChange = useCallback((paneId: PaneId, selectedIndex: number) => {
    setPaneUi((current) =>
      current[paneId].selectedIndex === selectedIndex
        ? current
        : {
            ...current,
            [paneId]: { ...current[paneId], selectedIndex },
          },
    );
  }, []);

  const handleViewModeChange = useCallback((paneId: PaneId, viewMode: ViewMode) => {
    setPaneUi((current) =>
      current[paneId].viewMode === viewMode
        ? current
        : {
            ...current,
            [paneId]: { ...current[paneId], viewMode },
          },
    );
  }, []);

  const handleSortChange = useCallback((paneId: PaneId, sortBy: SortOption, sortOrder: SortOrder) => {
    setPaneUi((current) =>
      current[paneId].sortBy === sortBy && current[paneId].sortOrder === sortOrder
        ? current
        : {
            ...current,
            [paneId]: { ...current[paneId], sortBy, sortOrder },
          },
    );
  }, []);

  const handleDualModeToggle = useCallback(() => {
    setDualMode((prev) => {
      const nextDualMode = !prev;

      if (!nextDualMode) {
        setActivePane("left");
        setInternalClipboard(null);
        setSearchActivePane((paneId) => (paneId === "right" ? null : paneId));
        setPaneUi((current) => ({
          ...current,
          right: createDefaultPaneUiState(),
        }));
        return nextDualMode;
      }

      setPaneUi((current) => ({
        ...current,
        right: createDefaultPaneUiState(),
      }));
      void rightPane.resetToInitialPath();
      return nextDualMode;
    });
  }, [rightPane]);

  const performTransfer = useCallback(
    async (mode: TransferMode, sourcePaneId: PaneId, destinationPaneId: PaneId, item: FileItem) => {
      const destinationPane = destinationPaneId === "left" ? leftPane : rightPane;

      setOperationError(null);

      try {
        if (mode === "copy") {
          await destinationPane.copyItemToDirectory(item, destinationPane.currentPath);
          await refreshPane(destinationPaneId);
          return true;
        }

        await destinationPane.moveItemToDirectory(item, destinationPane.currentPath);
        await refreshPane(sourcePaneId);
        await refreshPane(destinationPaneId);
        return true;
      } catch (error) {
        console.error(`Unable to ${mode} item between panes:`, error);
        setOperationError(`No se pudo ${mode === "copy" ? "copiar" : "mover"} este elemento. Intenta de nuevo.`);
        return false;
      }
    },
    [leftPane, refreshPane, rightPane],
  );

  const handleClipboardAction = useCallback((sourcePane: PaneId, mode: TransferMode, item: FileItem) => {
    setInternalClipboard({ sourcePane, mode, item });
    setOperationError(null);
  }, []);

  const keyboardStateRef = useRef({
    paneUi,
    activePane,
    dualMode,
    performTransfer,
    handleClipboardAction,
    internalClipboard,
    setInternalClipboard,
  });

  keyboardStateRef.current = {
    paneUi,
    activePane,
    dualMode,
    performTransfer,
    handleClipboardAction,
    internalClipboard,
    setInternalClipboard,
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      const state = keyboardStateRef.current;
      const selectedItem = state.paneUi[state.activePane].selectedItem;
      const inactivePane = state.activePane === "left" ? "right" : "left";

      if (event.key === "F5" && state.dualMode && selectedItem) {
        event.preventDefault();
        void state.performTransfer("copy", state.activePane, inactivePane, selectedItem);
        return;
      }

      if (event.key === "F6" && state.dualMode && selectedItem) {
        event.preventDefault();
        void state.performTransfer("move", state.activePane, inactivePane, selectedItem);
        return;
      }

      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if ((key === "c" || key === "x") && state.dualMode && selectedItem) {
        event.preventDefault();
        state.handleClipboardAction(state.activePane, key === "c" ? "copy" : "move", selectedItem);
        return;
      }

      if (key === "v" && state.dualMode && state.internalClipboard) {
        event.preventDefault();
        void state.performTransfer(state.internalClipboard.mode, state.internalClipboard.sourcePane, state.activePane, state.internalClipboard.item).then((success: boolean) => {
          if (success && state.internalClipboard?.mode === "move") {
            state.setInternalClipboard(null);
          }
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderFilePane = (paneId: PaneId, paneLabel: string) => {
    const pane = paneId === "left" ? leftPane : rightPane;
    const ui = paneUi[paneId];
    const inactivePane = paneId === "left" ? "right" : "left";

    return (
      <div
        data-testid={`file-list-scroll-region${paneId === "left" ? "" : "-right"}`}
        className="scrollbar-hidden min-w-0 overflow-auto p-5"
      >
        <FileExplorer
          initialFiles={pane.files}
          initialPath={pane.currentPath}
          isLoading={pane.isLoading}
          isSearchActive={searchActivePane === paneId && activePane === paneId}
          errorMessage={pane.errorMessage}
          onLoadFolder={pane.loadFolder}
          onRenameItem={pane.renameItem}
          onDeleteItem={pane.deleteItem}
          onRetry={() => pane.navigateToPath(pane.currentPath)}
          onSelectionChange={(item) => handleSelectionChange(paneId, item)}
          onTogglePreview={() => setPreviewOpen((prev) => !prev)}
          onPathChange={(path, nextFiles) => {
            pane.setCurrentPath(path);
            pane.setFiles(nextFiles);
          }}
          paneId={paneId}
          paneLabel={paneLabel}
          isActivePane={activePane === paneId}
          selectedIndex={ui.selectedIndex}
          viewMode={ui.viewMode}
          sortBy={ui.sortBy}
          sortOrder={ui.sortOrder}
          onSelectedIndexChange={(selectedIndex) => handleSelectedIndexChange(paneId, selectedIndex)}
          onViewModeChange={(viewMode) => handleViewModeChange(paneId, viewMode)}
          onSortChange={(sortBy, sortOrder) => handleSortChange(paneId, sortBy, sortOrder)}
          onActivatePane={setActivePane}
          onCopyToInactivePane={dualMode ? (item) => void performTransfer("copy", paneId, inactivePane, item) : undefined}
          onMoveToInactivePane={dualMode ? (item) => void performTransfer("move", paneId, inactivePane, item) : undefined}
        />
      </div>
    );
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar>
        <FileTreeSidebar
          rootPath={rootPath}
          currentPath={currentPath}
          onLoadFolder={loadFolder}
          onNavigate={navigateToPath}
        />
      </Sidebar>

      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleGoBack();
                  }}
                  disabled={!canGoBack || isLoading}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleGoForward();
                  }}
                  disabled={!canGoForward || isLoading}
                  aria-label="Go forward"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleGoUp();
                  }}
                  disabled={!canGoUp || isLoading}
                  aria-label="Go up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleRefresh();
                  }}
                  disabled={isLoading}
                  aria-label="Refresh folder"
                >
                  <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDualModeToggle}
                  aria-label="Toggle dual-pane split view"
                  aria-pressed={dualMode}
                >
                  <Columns2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="min-w-0 space-y-1">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Rust Explorer
                </p>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-foreground" />
                  <h1 className="truncate text-xl font-medium leading-none text-foreground">
                    {getPathLabel(currentPath)}
                  </h1>
                </div>
                <p
                  className="truncate font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                  title={currentPath}
                >
                  {currentPath}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-3 md:w-auto">
            <InputGroupDemo 
              currentPath={currentPath}
              onSearchStateChange={(isActive) => setSearchActivePane(isActive ? activePane : null)}
              onSearchResults={(results) => setFiles(results)}
              onClearSearch={() => navigateToPath(currentPath, { recordHistory: false })}
            />
            <SettingsDialog />
          </div>
        </header>
        <main
          data-testid="app-content-frame"
          className="w-full flex-1 overflow-hidden bg-background"
        >
          <div className="flex h-full min-h-0">
            <div
              data-testid="pane-grid"
              className={`${dualMode ? "split-view-grid" : "single-pane-grid"} min-w-0 flex-1`}
            >
              {renderFilePane("left", "Left file pane")}
              {dualMode ? renderFilePane("right", "Right file pane") : null}
              {operationError ? (
                <p className="px-5 pb-3 text-sm text-destructive" role="alert">
                  {operationError}
                </p>
              ) : null}
              {internalClipboard ? (
                <span className="sr-only" aria-live="polite">
                  {internalClipboard.mode} pending from {internalClipboard.sourcePane} pane
                </span>
              ) : null}
            </div>

            <PreviewPanel
              open={previewOpen}
              selectedName={selectedPreviewItem?.name}
              payload={payload}
              isLoading={isPreviewLoading}
              error={previewError}
              onContentReadyChange={setPreviewContentReady}
            />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
