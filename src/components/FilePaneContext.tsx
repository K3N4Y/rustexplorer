import { createContext, useContext } from 'react';
import type { FileItem } from './file-types';

import type { PaneId, SortOption, SortOrder, ViewMode } from '../types/pane';

export interface FilePaneContextValue {
  initialPath?: string;
  isLoading?: boolean;
  isSearchActive?: boolean;
  errorMessage?: string | null;
  onLoadFolder: (path: string) => Promise<FileItem[]>;
  onPathChange?: (path: string, files: FileItem[]) => void;
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
  onSelectedIndexChange?: (index: number) => void;
  onViewModeChange?: (viewMode: ViewMode) => void;
  onSortChange?: (sortBy: SortOption, sortOrder: SortOrder) => void;
  onActivatePane?: (paneId: PaneId) => void;
  onCopyToInactivePane?: (item: FileItem) => void;
  onMoveToInactivePane?: (item: FileItem) => void;
  onCreateWorkspace?: () => void;
  onCreateTag?: () => void;
}

const FilePaneContext = createContext<FilePaneContextValue | undefined>(undefined);

export function FilePaneProvider({ children, value }: { children: React.ReactNode; value: FilePaneContextValue }) {
  return <FilePaneContext.Provider value={value}>{children}</FilePaneContext.Provider>;
}

export function useFilePaneContext(): FilePaneContextValue {
  const context = useContext(FilePaneContext);
  if (context === undefined) {
    throw new Error('useFilePaneContext must be used within a FilePaneProvider');
  }
  return context;
}