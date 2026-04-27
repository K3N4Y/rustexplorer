import React, { useCallback, useMemo, useState } from 'react';
import { openPath } from '@tauri-apps/plugin-opener';
import {
  AlertCircle,
  FolderOpen,
  LoaderCircle,
  RefreshCcw,
  LayoutGrid,
  List
} from 'lucide-react';
import BreadcrumbPath from './BreadcrumbPath';
import type { FileItem } from './file-types';
import { RenameDialog } from './RenameDialog';
import { DeleteAlertDialog } from './DeleteAlertDialog';

import { getFileAppearance } from '../lib/file-appearance';
import { getParentPath } from '../lib/path-utils';
import { useSettings } from '../lib/settings-provider';
import FileItemShell from './FileItemShell';
import FileIconComponent from './FileIcon';
import SortIcon from './SortIcon';

interface FileExplorerProps {
  initialFiles: FileItem[];
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
  selectedIndex?: number;
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

import type { PaneId, SortOption, SortOrder, ViewMode } from '../types/pane';

const toOpenablePath = (path: string): string => {
  if (!/^[a-zA-Z]:\\/.test(path)) {
    return path;
  }

  return path.replace(/\\/g, '/');
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  initialFiles,
  initialPath = '/',
  isLoading = false,
  isSearchActive = false,
  errorMessage = null,
  onLoadFolder,
  onPathChange,
  onRenameItem,
  onDeleteItem,
  onRetry,
  onSelectionChange,
  onTogglePreview,
  paneId = 'left',
  paneLabel = 'File explorer',
  isActivePane,
  selectedIndex: selectedIndexProp,
  viewMode: viewModeProp,
  sortBy: sortByProp,
  sortOrder: sortOrderProp,
  onSelectedIndexChange,
  onViewModeChange,
  onSortChange,
  onActivatePane,
  onCopyToInactivePane,
  onMoveToInactivePane,
  onCreateWorkspace,
  onCreateTag,
}) => {
  const currentPath = initialPath;
  const files = initialFiles;
  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number>(0);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('list');

  const [internalSortBy, setInternalSortBy] = useState<SortOption>('name');
  const [internalSortOrder, setInternalSortOrder] = useState<SortOrder>('asc');

  const active = isActivePane ?? true;
  const selectedIndex = selectedIndexProp ?? internalSelectedIndex;
  const viewMode = viewModeProp ?? internalViewMode;
  const sortBy = sortByProp ?? internalSortBy;
  const sortOrder = sortOrderProp ?? internalSortOrder;

  const { itemsPerPage } = useSettings();
  const [currentPage, setCurrentPage] = useState(1);

  const sortedFiles = useMemo(() => {
    if (isSearchActive) {
      return files;
    }

    return [...files].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modified': {
          const timeA = a.modified ? new Date(a.modified).getTime() : 0;
          const timeB = b.modified ? new Date(b.modified).getTime() : 0;
          comparison = timeA - timeB;
          break;
        }
        case 'type': {
          const extA = a.name.includes('.') ? a.name.split('.').pop() || '' : '';
          const extB = b.name.includes('.') ? b.name.split('.').pop() || '' : '';
          comparison = extA.localeCompare(extB);
          break;
        }
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [files, isSearchActive, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleFiles = useMemo(
    () => sortedFiles.slice(startIndex, startIndex + itemsPerPage),
    [itemsPerPage, sortedFiles, startIndex],
  );
  const isEmpty = !isLoading && !errorMessage && sortedFiles.length === 0;

  const onSelectionChangeRef = React.useRef(onSelectionChange);
  onSelectionChangeRef.current = onSelectionChange;

  React.useEffect(() => {
    onSelectionChangeRef.current?.(visibleFiles[selectedIndex] ?? null);
  }, [selectedIndex, visibleFiles]);

  const isFolder = (item: FileItem): boolean => item.isDirectory;

  const navigateToPath = useCallback(async (path: string) => {
    try {
      const nextFiles = await onLoadFolder(path);
      onPathChange?.(path, nextFiles);
    } catch (error) {
      console.error('Error loading folder:', error);
    }
  }, [onLoadFolder, onPathChange]);

  const openItem = useCallback(async (item: FileItem) => {
    if (isFolder(item)) {
      await navigateToPath(item.path);
      return;
    }

    try {
      await openPath(toOpenablePath(item.path));
    } catch (error) {
      console.error('Error opening file:', error);
    }
  }, [navigateToPath]);

  const openRenameDialog = useCallback((file: FileItem) => {
    setFileToRename(file);
    setNewFileName(file.name);
    setRenameDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((file: FileItem) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  }, []);

  const setSelectedIndex = (nextIndex: number | ((currentIndex: number) => number)) => {
    const next = typeof nextIndex === 'function' ? nextIndex(selectedIndex) : nextIndex;

    if (next === selectedIndex) {
      return;
    }

    if (selectedIndexProp === undefined) {
      setInternalSelectedIndex(next);
    }

    onSelectedIndexChange?.(next);
  };

  const setViewMode = (nextViewMode: ViewMode) => {
    if (nextViewMode === viewMode) {
      return;
    }

    if (viewModeProp === undefined) {
      setInternalViewMode(nextViewMode);
    }

    onViewModeChange?.(nextViewMode);
  };

  const setSort = (nextSortBy: SortOption, nextSortOrder: SortOrder) => {
    if (nextSortBy === sortBy && nextSortOrder === sortOrder) {
      return;
    }

    if (sortByProp === undefined) {
      setInternalSortBy(nextSortBy);
    }
    if (sortOrderProp === undefined) {
      setInternalSortOrder(nextSortOrder);
    }

    onSortChange?.(nextSortBy, nextSortOrder);
  };

  const activatePane = useCallback(() => {
    onActivatePane?.(paneId);
  }, [onActivatePane, paneId]);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIndex(0);
  }, [initialFiles, currentPath, sortBy, sortOrder]);

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToRename || !newFileName.trim()) return;

    if (newFileName.trim() === fileToRename.name) {
      setRenameDialogOpen(false);
      return;
    }

    try {
      if (onRenameItem) {
        await onRenameItem(fileToRename, newFileName.trim());
      }
      setRenameDialogOpen(false);
      setFileToRename(null);
    } catch (error) {
      console.error('Error renaming item:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !onDeleteItem) return;

    try {
      await onDeleteItem(fileToDelete);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const selectedIndexRef = React.useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const visibleFilesRef = React.useRef(visibleFiles);
  visibleFilesRef.current = visibleFiles;

  const currentPathRef = React.useRef(currentPath);
  currentPathRef.current = currentPath;

  const setSelectedIndexRef = React.useRef(setSelectedIndex);
  setSelectedIndexRef.current = setSelectedIndex;

  const openItemRef = React.useRef(openItem);
  openItemRef.current = openItem;

  const navigateToPathRef = React.useRef(navigateToPath);
  navigateToPathRef.current = navigateToPath;

  const onTogglePreviewRef = React.useRef(onTogglePreview);
  onTogglePreviewRef.current = onTogglePreview;

  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!active) return;

      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const currentVisibleFiles = visibleFilesRef.current;
      const currentSelectedIndex = selectedIndexRef.current;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentVisibleFiles.length > 0) {
          setSelectedIndexRef.current((prev) => Math.min(prev + 1, currentVisibleFiles.length - 1));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentVisibleFiles.length > 0) {
          setSelectedIndexRef.current((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentVisibleFiles.length > 0 && document.activeElement?.tagName !== 'BUTTON') {
          const selectedItem = currentVisibleFiles[currentSelectedIndex];
          if (selectedItem) {
            await openItemRef.current(selectedItem);
          }
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const parentPath = getParentPath(currentPathRef.current);
        if (parentPath !== '/' && parentPath !== currentPathRef.current) {
          await navigateToPathRef.current(parentPath);
        }
      } else if (e.key === ' ') {
        if (currentVisibleFiles.length > 0) {
          e.preventDefault();
          onTogglePreviewRef.current?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';

    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (size: number, folder: boolean): string => {
    if (folder) return '-';
    if (size === 0) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleSort = (option: SortOption) => {
    if (isSearchActive) {
      return;
    }

    if (sortBy === option) {
      setSort(option, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(option, 'asc');
    }
  };

  const sortHeaderClassName = isSearchActive
    ? 'flex items-center text-muted-foreground/55'
    : 'flex items-center cursor-pointer rounded-sm transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25';

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
      data-testid={`file-pane-${paneId}`}
      data-active-pane={active}
      tabIndex={0}
      aria-label={paneLabel}
      onFocus={activatePane}
      onClick={activatePane}
    >
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        <BreadcrumbPath currentPath={currentPath} onNavigate={navigateToPath}>
          <div className="flex items-center gap-1 rounded-full border border-border-visible bg-transparent p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 text-muted-foreground hover:text-foreground ${
                viewMode === 'list' ? 'bg-primary text-primary-foreground' : ''
              }`}
              title="View as List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 text-muted-foreground hover:text-foreground ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''
              }`}
              title="View as Grid"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </BreadcrumbPath>

        {viewMode === 'list' && (
          <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground select-none">
            <span className={sortHeaderClassName} onClick={() => handleSort('name')}>
              Name <SortIcon option="name" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={isSearchActive} />
            </span>
            <span className={sortHeaderClassName} onClick={() => handleSort('modified')}>
              Modified <SortIcon option="modified" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={isSearchActive} />
            </span>
            <span className={sortHeaderClassName} onClick={() => handleSort('type')}>
              Type <SortIcon option="type" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={isSearchActive} />
            </span>
            <span className={sortHeaderClassName} onClick={() => handleSort('size')}>
              Size <SortIcon option="size" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={isSearchActive} />
            </span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="dot-grid-subtle flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border-visible bg-card text-primary">
            <LoaderCircle className="h-6 w-6 animate-spin" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-foreground">[LOADING]</p>
            <p className="text-[13px] text-muted-foreground">Estamos obteniendo los archivos de esta ruta.</p>
          </div>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-destructive text-destructive">
            <AlertCircle className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-foreground tracking-tight">Ocurrió un problema</p>
            <p className="text-[13px] text-muted-foreground">{errorMessage}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={() => {
                void onRetry();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-input bg-transparent px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.08em] transition-colors hover:border-ring hover:text-foreground"
            >
              <RefreshCcw className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              Reintentar
            </button>
          )}
        </div>
      )}

      {isEmpty && (
        <div className="dot-grid-subtle flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border-visible bg-card text-muted-foreground">
            <FolderOpen className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-foreground tracking-tight">Esta carpeta está vacía</p>
            <p className="text-[13px] text-muted-foreground/80">Cuando tenga archivos o subcarpetas, aparecerán aquí.</p>
          </div>
        </div>
      )}

      {!isLoading && !errorMessage && (
        viewMode === 'list' ? (
          <div>
            {visibleFiles.map((file, index) => {
              const folder = isFolder(file);
              const isSelected = selectedIndex === index;
              const appearance = getFileAppearance(file);

              return (
                <FileItemShell
                  key={file.path}
                  file={file}
                  index={index}
                  onOpen={openItem}
                  onRename={onRenameItem ? openRenameDialog : undefined}
                  onDelete={onDeleteItem ? openDeleteDialog : undefined}
                  onSelect={handleSelect}
                  onCopyToInactivePane={onCopyToInactivePane}
                  onMoveToInactivePane={onMoveToInactivePane}
                  onCreateWorkspace={onCreateWorkspace}
                  onCreateTag={onCreateTag}
                  className={`group/file-row grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] px-5 py-3.5 border-b border-border items-center cursor-pointer transition-colors duration-200 focus-within:bg-muted hover:bg-muted ${
                    isSelected
                      ? 'border-l-2 border-l-accent bg-muted text-foreground hover:bg-muted'
                      : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <FileIconComponent file={file} selected={isSelected} size="sm" />
                    <span className={`truncate leading-tight ${isSelected ? 'text-sm font-medium text-foreground' : 'text-sm font-medium text-foreground/90'}`}>{file.name}</span>
                  </div>

                  <span className={`font-mono text-[12px] ${isSelected ? 'font-bold text-foreground/90' : 'text-muted-foreground'}`}>
                    {formatDate(file.modified)}
                  </span>

                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
                      folder 
                        ? isSelected 
                          ? 'border-foreground text-foreground' 
                          : 'border-border-visible text-muted-foreground'
                        : isSelected 
                          ? 'border-foreground text-foreground'
                          : 'border-border-visible text-muted-foreground'
                    }`}
                  >
                    {folder ? 'DIRECTORY' : appearance.chipLabel}
                  </span>

                  <span className={`font-mono text-[12px] font-bold tabular-nums ${isSelected ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                    {formatSize(file.size, folder)}
                  </span>
                </FileItemShell>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
            {visibleFiles.map((file, index) => {
              const folder = isFolder(file);
              const isSelected = selectedIndex === index;
              const appearance = getFileAppearance(file);

              return (
                <FileItemShell
                  key={file.path}
                  file={file}
                  index={index}
                  onOpen={openItem}
                  onRename={onRenameItem ? openRenameDialog : undefined}
                  onDelete={onDeleteItem ? openDeleteDialog : undefined}
                  onSelect={handleSelect}
                  onCopyToInactivePane={onCopyToInactivePane}
                  onMoveToInactivePane={onMoveToInactivePane}
                  onCreateWorkspace={onCreateWorkspace}
                  onCreateTag={onCreateTag}
                  className={`group/file-tile flex flex-col items-center justify-center rounded-xl border p-4 cursor-pointer transition-[background-color,border-color] duration-200 focus-within:bg-muted hover:bg-muted ${
                    isSelected
                      ? 'border-t-2 border-t-accent bg-muted border-foreground hover:bg-muted hover:border-foreground'
                      : 'bg-card border-border hover:border-border-visible'
                  }`}
                >
                  <div className="mb-3.5 relative">
                    <FileIconComponent file={file} selected={isSelected} size="lg" />
                  </div>
                  <span 
                    className={`text-[12.5px] text-center w-full break-words line-clamp-2 px-1 leading-snug transition-colors ${
                      isSelected ? 'font-medium text-foreground' : 'font-medium text-foreground/90'
                    }`}
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  {!folder && (
                    <span className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                      {appearance.chipLabel}
                    </span>
                  )}
                </FileItemShell>
              );
            })}
          </div>
        )
      )}

      {currentPath !== '/' && !isLoading && !errorMessage && !isEmpty && (
        <div className="px-4 py-3 border-t border-border bg-muted/20 sticky bottom-0 z-10 hidden">
          <button
            onClick={async () => {
              const parentPath = getParentPath(currentPath);
              await navigateToPath(parentPath);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Back
          </button>
        </div>
      )}

      {totalPages > 1 && !isLoading && !errorMessage && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-card px-4 py-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, files.length)} of {files.length} items
          </span>
          <div className="flex items-center gap-4 text-[13px]">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-border-visible bg-transparent px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-border-visible bg-transparent px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <RenameDialog
        isOpen={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open);
          if (!open) setFileToRename(null);
        }}
        fileToRename={fileToRename}
        newFileName={newFileName}
        setNewFileName={setNewFileName}
        onSubmit={handleRenameSubmit}
      />

      <DeleteAlertDialog
        isOpen={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setFileToDelete(null);
        }}
        fileToDelete={fileToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default React.memo(FileExplorer);
