import { createContext, useContext, useMemo } from 'react';
import type { FileItem } from './file-types';
import type { PaneId, SortOption, SortOrder, ViewMode } from '../types/pane';

export interface FilePaneContextValue {
  currentPath?: string;
  isLoading?: boolean;
  isSearchActive?: boolean;
  errorMessage?: string | null;
  onLoadFolder: (path: string) => Promise<FileItem[]>;
  onPathChange?: (path: string, files: FileItem[]) => void;
  navigateToPath?: (path: string, options?: { recordHistory?: boolean }) => Promise<FileItem[]>;
  onRenameItem?: (item: FileItem, newName: string) => Promise<void>;
  onDeleteItem?: (item: FileItem) => Promise<void>;
  onRetry?: () => Promise<unknown>;
  onSelectionChange?: (item: FileItem | null) => void;
  onTogglePreview?: () => void;
  paneId?: PaneId;
  paneLabel?: string;
  isActivePane?: boolean;
  viewMode?: ViewMode;
  sortBy?: SortOption;
  sortOrder?: SortOrder;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onSortChange?: (sortBy: SortOption, sortOrder: SortOrder) => void;
  onActivatePane?: (paneId: PaneId) => void;
  onCopyToInactivePane?: (item: FileItem) => void;
  onMoveToInactivePane?: (item: FileItem) => void;
  onCreateWorkspace?: () => void;
  onCreateTag?: () => void;
}

export interface FilePaneStateContextValue {
  currentPath?: string;
  isLoading?: boolean;
  isSearchActive?: boolean;
  errorMessage?: string | null;
  paneId?: PaneId;
  paneLabel?: string;
  isActivePane?: boolean;
  viewMode?: ViewMode;
  sortBy?: SortOption;
  sortOrder?: SortOrder;
  selectedIndex?: number;
}

export interface FilePaneActionContextValue {
  onLoadFolder: (path: string) => Promise<FileItem[]>;
  onPathChange?: (path: string, files: FileItem[]) => void;
  navigateToPath?: (path: string, options?: { recordHistory?: boolean }) => Promise<FileItem[]>;
  onRenameItem?: (item: FileItem, newName: string) => Promise<void>;
  onDeleteItem?: (item: FileItem) => Promise<void>;
  onRetry?: () => Promise<unknown>;
  onSelectionChange?: (item: FileItem | null) => void;
  onTogglePreview?: () => void;
  onSelectedIndexChange?: (index: number) => void;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onSortChange?: (sortBy: SortOption, sortOrder: SortOrder) => void;
  onActivatePane?: (paneId: PaneId) => void;
  onCopyToInactivePane?: (item: FileItem) => void;
  onMoveToInactivePane?: (item: FileItem) => void;
  onCreateWorkspace?: () => void;
  onCreateTag?: () => void;
}

const FilePaneStateContext = createContext<FilePaneStateContextValue | undefined>(undefined);
const FilePaneActionContext = createContext<FilePaneActionContextValue | undefined>(undefined);

export function FilePaneStateProvider({ children, value }: { children: React.ReactNode; value: FilePaneStateContextValue }) {
  return <FilePaneStateContext.Provider value={value}>{children}</FilePaneStateContext.Provider>;
}

export function FilePaneActionProvider({ children, value }: { children: React.ReactNode; value: FilePaneActionContextValue }) {
  return <FilePaneActionContext.Provider value={value}>{children}</FilePaneActionContext.Provider>;
}

/**
 * Convenience provider that combines both state and action contexts.
 * Prefer using FilePaneStateProvider + FilePaneActionProvider directly in production.
 * This combined provider is primarily intended for testing convenience.
 */
export function FilePaneProvider({ children, value }: { children: React.ReactNode; value: FilePaneContextValue }) {
  const stateValue = useMemo(() => ({
    currentPath: value.currentPath,
    isLoading: value.isLoading,
    isSearchActive: value.isSearchActive,
    errorMessage: value.errorMessage,
    paneId: value.paneId,
    paneLabel: value.paneLabel,
    isActivePane: value.isActivePane,
    viewMode: value.viewMode,
    sortBy: value.sortBy,
    sortOrder: value.sortOrder,
    selectedIndex: value.selectedIndex,
  }), [    value.currentPath, value.isLoading, value.isSearchActive, value.errorMessage, value.paneId, value.paneLabel, value.isActivePane, value.viewMode, value.sortBy, value.sortOrder, value.selectedIndex]);

  const actionValue = useMemo(() => ({
    onLoadFolder: value.onLoadFolder,
    onPathChange: value.onPathChange,
    navigateToPath: value.navigateToPath,
    onRenameItem: value.onRenameItem,
    onDeleteItem: value.onDeleteItem,
    onRetry: value.onRetry,
    onSelectionChange: value.onSelectionChange,
    onTogglePreview: value.onTogglePreview,
    onSelectedIndexChange: value.onSelectedIndexChange,
    onViewModeChange: value.onViewModeChange,
    onSortChange: value.onSortChange,
    onActivatePane: value.onActivatePane,
    onCopyToInactivePane: value.onCopyToInactivePane,
    onMoveToInactivePane: value.onMoveToInactivePane,
    onCreateWorkspace: value.onCreateWorkspace,
    onCreateTag: value.onCreateTag,
  }), [value.onLoadFolder, value.onPathChange, value.navigateToPath, value.onRenameItem, value.onDeleteItem, value.onRetry, value.onSelectionChange, value.onTogglePreview, value.onSelectedIndexChange, value.onViewModeChange, value.onSortChange, value.onActivatePane, value.onCopyToInactivePane, value.onMoveToInactivePane, value.onCreateWorkspace, value.onCreateTag]);

  return (
    <FilePaneStateProvider value={stateValue}>
      <FilePaneActionProvider value={actionValue}>
        {children}
      </FilePaneActionProvider>
    </FilePaneStateProvider>
  );
}

export function useFilePaneStateContext(): FilePaneStateContextValue {
  const context = useContext(FilePaneStateContext);
  if (context === undefined) {
    throw new Error('useFilePaneStateContext must be used within a FilePaneStateProvider');
  }
  return context;
}

export function useFilePaneActionContext(): FilePaneActionContextValue {
  const context = useContext(FilePaneActionContext);
  if (context === undefined) {
    throw new Error('useFilePaneActionContext must be used within a FilePaneActionProvider');
  }
  return context;
}

export function useFilePaneContext(): FilePaneContextValue {
  const state = useFilePaneStateContext();
  const actions = useFilePaneActionContext();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
