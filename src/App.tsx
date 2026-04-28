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
import { toast } from "sonner";
import "./App.css";
import FilePane from "./components/FilePane";
import FileTreeSidebar from "./components/FileTreeSidebar";
import type { FileItem } from "./components/file-types";
import type { PaneId, ViewMode, SortOption, SortOrder } from "./types/pane";
import type { PaneUiState, ViewLocation } from "./components/FilePane";
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
import { homeDir, desktopDir } from "@tauri-apps/api/path";
import { CommandPaletteProvider } from "@/components/command-palette/CommandPaletteProvider";
import { CommandPaletteDialog } from "@/components/command-palette/CommandPaletteDialog";
import { Toaster } from "@/components/ui/sonner";
import { useCommandEffect } from "@/hooks/useCommandEffect";
import { useCommandRegistry } from "@/hooks/useCommandRegistry";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { WorkspaceProvider } from "@/lib/workspace-provider";
import { TagManagerDialog } from "@/components/tag-manager-dialog";
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog";

type TransferMode = "copy" | "move";

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

function AppContent() {
  const [rootPath, setRootPath] = useState<string | null>(null);

  useEffect(() => {
    homeDir()
      .then((path) => setRootPath(path))
      .catch(() => {
        desktopDir()
          .then((path) => setRootPath(path))
          .catch(() => setRootPath(""));
      });
  }, []);

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
  const [leftViewLocation, setLeftViewLocation] = useState<ViewLocation>({ type: "fs", path: rootPath ?? "" });
  const [rightViewLocation, setRightViewLocation] = useState<ViewLocation>({ type: "fs", path: rootPath ?? "" });
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const leftPane = useFileNavigation(rootPath ?? "");
  const rightPane = useFileNavigation(rootPath ?? "");
  const activePaneState = activePane === "left" ? leftPane : rightPane;

  const leftPaneRef = useRef(leftPane);
  leftPaneRef.current = leftPane;
  const rightPaneRef = useRef(rightPane);
  rightPaneRef.current = rightPane;

  useEffect(() => {
    if (rootPath) {
      void leftPaneRef.current.navigateToPath(rootPath, { recordHistory: false });
      void rightPaneRef.current.navigateToPath(rootPath, { recordHistory: false });
      setLeftViewLocation({ type: "fs", path: rootPath });
      setRightViewLocation({ type: "fs", path: rootPath });
    }
  }, [rootPath]);

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

  const { workspaces, tags, addToWorkspace, renameWorkspace } = useWorkspaces();
  const { register, unregister } = useCommandRegistry();
  const addToWorkspaceRef = useRef(addToWorkspace);
  addToWorkspaceRef.current = addToWorkspace;
  const selectedItem = paneUi[activePane].selectedItem;

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

  const handleOpenWorkspace = useCallback((workspaceId: string) => {
    if (activePane === "left") {
      setLeftViewLocation({ type: "workspace", workspaceId });
    } else {
      setRightViewLocation({ type: "workspace", workspaceId });
    }
  }, [activePane]);

  useEffect(() => {
    setPaneUi((current) => {
      if (current.left.selectedItem === null && current.left.selectedIndex === 0) {
        return current;
      }
      return {
        ...current,
        left: { ...current.left, selectedItem: null, selectedIndex: 0 },
      };
    });
  }, [leftPane.currentPath]);

  useEffect(() => {
    setPaneUi((current) => {
      if (current.right.selectedItem === null && current.right.selectedIndex === 0) {
        return current;
      }
      return {
        ...current,
        right: { ...current.right, selectedItem: null, selectedIndex: 0 },
      };
    });
  }, [rightPane.currentPath]);

  useEffect(() => {
    const commandsToCleanup: string[] = [];

    workspaces.forEach((workspace) => {
      const id = `workspace-open-${workspace.id}`;
      register({
        id,
        label: `Workspace: Open ${workspace.name}`,
        description: `Open workspace ${workspace.name}`,
        icon: "Briefcase",
        keywords: ["workspace", workspace.name.toLowerCase(), "open"],
        category: "Workspaces",
        action: () => {
          if (activePane === "left") {
            setLeftViewLocation({ type: "workspace", workspaceId: workspace.id });
          } else {
            setRightViewLocation({ type: "workspace", workspaceId: workspace.id });
          }
        },
      });
      commandsToCleanup.push(id);
    });

    tags.forEach((tag) => {
      const id = `tag-filter-${tag.id}`;
      register({
        id,
        label: `Tag: Filter #${tag.name}`,
        description: `Filter by tag ${tag.name}`,
        icon: "Tag",
        keywords: ["tag", tag.name.toLowerCase(), "filter"],
        category: "Tags",
        action: () => {
          if (activePane === "left") {
            setLeftViewLocation({ type: "tag", tagId: tag.id });
          } else {
            setRightViewLocation({ type: "tag", tagId: tag.id });
          }
        },
      });
      commandsToCleanup.push(id);
    });

    const tagManagerId = "tags-manage";
    register({
      id: tagManagerId,
      label: "Tags: Manage",
      description: "Open the tag manager dialog",
      icon: "Tags",
      keywords: ["tags", "manage", "edit", "organize"],
      category: "Tags",
      action: () => setTagManagerOpen(true),
    });
    commandsToCleanup.push(tagManagerId);

    if (selectedItem) {
      workspaces.forEach((workspace) => {
        const id = `workspace-add-selection-${workspace.id}`;
        register({
          id,
          label: `Add selection to workspace: ${workspace.name}`,
          description: `Add ${selectedItem.name} to workspace ${workspace.name}`,
          icon: "Plus",
          keywords: ["workspace", workspace.name.toLowerCase(), "add", "selection"],
          category: "Workspaces",
          action: () => {
            void addToWorkspaceRef.current(workspace.id, selectedItem.path);
          },
        });
        commandsToCleanup.push(id);
      });
    }

    return () => {
      commandsToCleanup.forEach((id) => unregister(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, tags, activePane, selectedItem, register, unregister]);

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

  useCommandEffect({
    id: "nav-toggle-preview",
    label: "Toggle Preview Pane",
    description: "Show or hide the file preview",
    icon: "PanelRight",
    keywords: ["preview", "pane", "toggle", "show"],
    category: "Navigation",
    shortcut: "Space",
    action: () => setPreviewOpen((prev) => !prev),
  });

  useCommandEffect({
    id: "nav-toggle-view-mode",
    label: "Toggle View Mode",
    description: "Switch between list and grid view",
    icon: "LayoutGrid",
    keywords: ["view", "mode", "list", "grid", "layout"],
    category: "Navigation",
    action: () => setPaneUi((prev) => ({
      ...prev,
      left: { ...prev.left, viewMode: prev.left.viewMode === "list" ? "grid" : "list" },
      right: { ...prev.right, viewMode: prev.right.viewMode === "list" ? "grid" : "list" },
    })),
  });

  useCommandEffect({
    id: "pane-toggle-dual",
    label: "Toggle Dual Pane Mode",
    description: "Enable or disable dual pane view",
    icon: "Columns",
    keywords: ["dual", "pane", "split", "two"],
    category: "Dual Pane",
    action: handleDualModeToggle,
  });

  useCommandEffect({
    id: "search-global",
    label: "Global Search",
    description: "Search across all files",
    icon: "Search",
    keywords: ["search", "find", "global", "files"],
    category: "Search",
    action: () => {
      toast.info("Global search", { description: "Not yet implemented" });
    },
  });

  useCommandEffect({
    id: "git-init",
    label: "Initialize Git Repository",
    description: "Initialize a new git repo in the current directory",
    icon: "GitBranch",
    keywords: ["git", "init", "repository", "version control"],
    category: "Git",
    action: () => {
      toast.info("Git init", { description: "Not yet implemented" });
    },
  });

  useCommandEffect({
    id: "nav-go-to-parent",
    label: "Go to Parent Directory",
    description: "Navigate up one level",
    icon: "ArrowUp",
    keywords: ["up", "parent", "back", "directory"],
    category: "Navigation",
    shortcut: "Alt+Up",
    action: () => {
      if (activePane === "left") {
        void leftPane.navigateToPath(leftPane.parentPath);
      } else {
        void rightPane.navigateToPath(rightPane.parentPath);
      }
    },
    isEnabled: () => (activePane === "left" ? leftPane.canGoUp : rightPane.canGoUp),
  });

  useCommandEffect({
    id: "settings-open",
    label: "Open Settings",
    description: "Open application settings",
    icon: "Settings",
    keywords: ["settings", "preferences", "config", "options"],
    category: "Settings",
    action: () => {
      toast.info("Settings", { description: "Not yet implemented" });
    },
  });

  if (rootPath === null) {
    return <div className="h-screen w-screen bg-background" />;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar>
        <FileTreeSidebar
          rootPath={rootPath}
          currentPath={currentPath}
          onLoadFolder={loadFolder}
          onNavigate={navigateToPath}
          onOpenWorkspace={handleOpenWorkspace}
          onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
          onRenameWorkspace={(workspace) => setRenameTarget({ id: workspace.id, name: workspace.name })}
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
              <FilePane
                paneId="left"
                paneLabel="Left file pane"
                pane={leftPane}
                ui={paneUi.left}
                activePane={activePane}
                searchActivePane={searchActivePane}
                dualMode={dualMode}
                homeDir={rootPath}
                viewLocation={leftViewLocation}
                onViewLocationChange={setLeftViewLocation}
                onSelectionChange={handleSelectionChange}
                onSelectedIndexChange={handleSelectedIndexChange}
                onViewModeChange={handleViewModeChange}
                onSortChange={handleSortChange}
                setPreviewOpen={setPreviewOpen}
                setActivePane={setActivePane}
                performTransfer={performTransfer}
                onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
                onCreateTag={() => setTagManagerOpen(true)}
              />
              {dualMode ? (
                <FilePane
                  paneId="right"
                  paneLabel="Right file pane"
                  pane={rightPane}
                  ui={paneUi.right}
                  activePane={activePane}
                  searchActivePane={searchActivePane}
                  dualMode={dualMode}
                  homeDir={rootPath}
                  viewLocation={rightViewLocation}
                  onViewLocationChange={setRightViewLocation}
                  onSelectionChange={handleSelectionChange}
                  onSelectedIndexChange={handleSelectedIndexChange}
                  onViewModeChange={handleViewModeChange}
                  onSortChange={handleSortChange}
                  setPreviewOpen={setPreviewOpen}
                  setActivePane={setActivePane}
                  performTransfer={performTransfer}
                onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
                onCreateTag={() => setTagManagerOpen(true)}
                />
              ) : null}
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

      <CommandPaletteDialog />
      <TagManagerDialog open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
      <CreateWorkspaceDialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen} />
      <CreateWorkspaceDialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        initialName={renameTarget?.name ?? ""}
        onSubmit={(name) => {
          if (renameTarget) {
            void renameWorkspace(renameTarget.id, name);
          }
          setRenameTarget(null);
        }}
      />
      <Toaster />
    </SidebarProvider>
  );
}

function App() {
  return (
    <WorkspaceProvider>
      <CommandPaletteProvider>
        <AppContent />
      </CommandPaletteProvider>
    </WorkspaceProvider>
  );
}

export default App;
