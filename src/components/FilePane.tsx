import { useCallback, useMemo } from "react";
import FileExplorer from "./FileExplorer";
import type { FileItem } from "./file-types";

export type PaneId = "left" | "right";
export type ViewMode = "list" | "grid";
export type SortOption = "name" | "modified" | "type" | "size";
export type SortOrder = "asc" | "desc";

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
}

export default function FilePane({
  paneId,
  paneLabel,
  pane,
  ui,
  activePane,
  searchActivePane,
  dualMode,
  onSelectionChange,
  onSelectedIndexChange,
  onViewModeChange,
  onSortChange,
  setPreviewOpen,
  setActivePane,
  performTransfer,
}: FilePaneProps) {
  const inactivePane = paneId === "left" ? "right" : "left";

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
      />
    </div>
  );
}
