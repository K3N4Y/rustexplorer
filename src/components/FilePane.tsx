import { memo, useCallback, useMemo } from "react";
import FileExplorer from "./FileExplorer";
import type { FileItem } from "./file-types";
import { WorkspaceView } from "./workspace-view";
import { TagFilterView } from "./tag-filter-view";
import BreadcrumbPath from "./BreadcrumbPath";
import { useWorkspaces } from "@/hooks/use-workspaces";

export type PaneId = "left" | "right";
export type ViewMode = "list" | "grid";
export type SortOption = "name" | "modified" | "type" | "size";
export type SortOrder = "asc" | "desc";

export type ViewLocation =
  | { type: "fs"; path: string }
  | { type: "workspace"; workspaceId: string }
  | { type: "tag"; tagId: string };

export type PaneUiState = {
  selectedItem: FileItem | null;
  selectedIndex: number;
  viewMode: ViewMode;
  sortBy: SortOption;
  sortOrder: SortOrder;
};

export type PaneNavigation = {
  files: FileItem[];
  currentPath: string;
  isLoading: boolean;
  errorMessage: string | null;
  loadFolder: (path: string) => Promise<FileItem[]>;
  renameItem: (item: FileItem, newName: string) => Promise<void>;
  deleteItem: (item: FileItem) => Promise<void>;
  navigateToPath: (path: string, options?: { recordHistory?: boolean }) => Promise<FileItem[]>;
  setCurrentPath: (path: string | ((prev: string) => string)) => void;
  setFiles: (files: FileItem[]) => void;
};

interface FilePaneProps {
  paneId: PaneId;
  paneLabel: string;
  pane: PaneNavigation;
  ui: PaneUiState;
  activePane: PaneId;
  searchActivePane: PaneId | null;
  dualMode: boolean;
  homeDir: string;
  viewLocation?: ViewLocation;
  onViewLocationChange?: (viewLocation: ViewLocation) => void;
  onSelectionChange: (paneId: PaneId, item: FileItem | null) => void;
  onSelectedIndexChange: (paneId: PaneId, selectedIndex: number) => void;
  onViewModeChange: (paneId: PaneId, viewMode: ViewMode) => void;
  onSortChange: (paneId: PaneId, sortBy: SortOption, sortOrder: SortOrder) => void;
  setPreviewOpen: (value: React.SetStateAction<boolean>) => void;
  setActivePane: (paneId: PaneId) => void;
  performTransfer: (
    mode: "copy" | "move",
    sourcePaneId: PaneId,
    destinationPaneId: PaneId,
    item: FileItem,
  ) => Promise<boolean>;
  onCreateWorkspace?: () => void;
  onCreateTag?: () => void;
}

function FilePane({
  paneId,
  paneLabel,
  pane,
  ui,
  activePane,
  searchActivePane,
  dualMode,
  homeDir,
  viewLocation,
  onViewLocationChange,
  onSelectionChange,
  onSelectedIndexChange,
  onViewModeChange,
  onSortChange,
  setPreviewOpen,
  setActivePane,
  performTransfer,
  onCreateWorkspace,
  onCreateTag,
}: FilePaneProps) {
  const inactivePane = paneId === "left" ? "right" : "left";
  const { workspaces, tags } = useWorkspaces();

  const effectiveViewLocation = useMemo(() => {
    if (!viewLocation || viewLocation.type === "fs") return viewLocation;
    if (viewLocation.type === "workspace") {
      const exists = workspaces.some((w) => w.id === viewLocation.workspaceId);
      return exists ? viewLocation : { type: "fs" as const, path: homeDir };
    }
    if (viewLocation.type === "tag") {
      const exists = tags.some((t) => t.id === viewLocation.tagId);
      return exists ? viewLocation : { type: "fs" as const, path: homeDir };
    }
    return viewLocation;
  }, [viewLocation, workspaces, tags, homeDir]);

  const handleSelectionChange = useCallback(
    (item: FileItem | null) => {
      onSelectionChange(paneId, item);
    },
    [onSelectionChange, paneId],
  );

  const handleSelectedIndexChange = useCallback(
    (selectedIndex: number) => {
      onSelectedIndexChange(paneId, selectedIndex);
    },
    [onSelectedIndexChange, paneId],
  );

  const handleViewModeChange = useCallback(
    (viewMode: ViewMode) => {
      onViewModeChange(paneId, viewMode);
    },
    [onViewModeChange, paneId],
  );

  const handleSortChange = useCallback(
    (sortBy: SortOption, sortOrder: SortOrder) => {
      onSortChange(paneId, sortBy, sortOrder);
    },
    [onSortChange, paneId],
  );

  const handleTogglePreview = useCallback(() => {
    setPreviewOpen((prev) => !prev);
  }, [setPreviewOpen]);

  const handleRetry = useCallback(async () => {
    await pane.navigateToPath(pane.currentPath);
  }, [pane]);

  const handlePathChange = useCallback(
    (path: string, nextFiles: FileItem[]) => {
      pane.setCurrentPath(path);
      pane.setFiles(nextFiles);
    },
    [pane],
  );

  const handleCopyToInactivePane = useMemo(() => {
    if (!dualMode) return undefined;
    return (item: FileItem) => void performTransfer("copy", paneId, inactivePane, item);
  }, [dualMode, performTransfer, paneId, inactivePane]);

  const handleMoveToInactivePane = useMemo(() => {
    if (!dualMode) return undefined;
    return (item: FileItem) => void performTransfer("move", paneId, inactivePane, item);
  }, [dualMode, performTransfer, paneId, inactivePane]);

  const handleWorkspaceItemNavigate = useCallback(
    async (path: string) => {
      onViewLocationChange?.({ type: "fs", path });
      await pane.navigateToPath(path);
    },
    [pane, onViewLocationChange],
  );

  const handleTagClick = useCallback(
    (tagId: string) => {
      onViewLocationChange?.({ type: "tag", tagId });
    },
    [onViewLocationChange],
  );

  const handleBreadcrumbNavigate = useCallback(
    async (path: string) => {
      if (effectiveViewLocation?.type !== "fs") {
        onViewLocationChange?.({ type: "fs", path });
      }
      await pane.navigateToPath(path);
    },
    [effectiveViewLocation, onViewLocationChange, pane],
  );

  return (
    <div
      data-testid={`file-list-scroll-region${paneId === "left" ? "" : "-right"}`}
      className="scrollbar-hidden min-w-0 overflow-auto p-5"
    >
      {effectiveViewLocation?.type === "workspace" ? (
        <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
          <div className="sticky top-0 z-10 border-b border-border bg-card">
            <BreadcrumbPath
              currentPath={pane.currentPath}
              onNavigate={handleBreadcrumbNavigate}
              viewLocation={effectiveViewLocation}
            />
          </div>
          <WorkspaceView
            workspaceId={effectiveViewLocation.workspaceId}
            onNavigate={handleWorkspaceItemNavigate}
            onTagClick={handleTagClick}
          />
        </div>
      ) : effectiveViewLocation?.type === "tag" ? (
        <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
          <div className="sticky top-0 z-10 border-b border-border bg-card">
            <BreadcrumbPath
              currentPath={pane.currentPath}
              onNavigate={handleBreadcrumbNavigate}
              viewLocation={effectiveViewLocation}
            />
          </div>
          <TagFilterView
            tagId={effectiveViewLocation.tagId}
            onNavigate={handleWorkspaceItemNavigate}
          />
        </div>
      ) : (
        <FileExplorer
          initialFiles={pane.files}
          initialPath={pane.currentPath}
          isLoading={pane.isLoading}
          isSearchActive={searchActivePane === paneId && activePane === paneId}
          errorMessage={pane.errorMessage}
          onLoadFolder={pane.loadFolder}
          onRenameItem={pane.renameItem}
          onDeleteItem={pane.deleteItem}
          onRetry={handleRetry}
          onSelectionChange={handleSelectionChange}
          onTogglePreview={handleTogglePreview}
          onPathChange={handlePathChange}
          paneId={paneId}
          paneLabel={paneLabel}
          isActivePane={activePane === paneId}
          selectedIndex={ui.selectedIndex}
          viewMode={ui.viewMode}
          sortBy={ui.sortBy}
          sortOrder={ui.sortOrder}
          onSelectedIndexChange={handleSelectedIndexChange}
          onViewModeChange={handleViewModeChange}
          onSortChange={handleSortChange}
          onActivatePane={setActivePane}
          onCopyToInactivePane={handleCopyToInactivePane}
          onMoveToInactivePane={handleMoveToInactivePane}
          onCreateWorkspace={onCreateWorkspace}
          onCreateTag={onCreateTag}
        />
      )}
    </div>
  );
}

export default memo(FilePane);
