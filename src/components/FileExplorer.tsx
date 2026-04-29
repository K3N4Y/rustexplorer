import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
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
import { useFilePaneStateContext, useFilePaneActionContext } from './FilePaneContext';
import type { SortOption, SortOrder, ViewMode } from '../types/pane';

interface FileExplorerProps {
  initialFiles: FileItem[];
}

const toOpenablePath = (path: string): string => {
  if (!/^[a-zA-Z]:\\/.test(path)) {
    return path;
  }

  return path.replace(/\\/g, '/');
};

const isFolder = (item: FileItem): boolean => item.isDirectory;

const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toLocaleDateString(navigator.language, {
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

const FileExplorer: React.FC<FileExplorerProps> = ({
  initialFiles,
}) => {
  const stateCtx = useFilePaneStateContext();
  const actionCtx = useFilePaneActionContext();

  const currentPath = stateCtx.currentPath ?? '/';
  const selectedIndex = stateCtx.selectedIndex ?? 0;
  const viewMode = stateCtx.viewMode ?? 'list';
  const sortBy = stateCtx.sortBy ?? 'name';
  const sortOrder = stateCtx.sortOrder ?? 'asc';
  const paneId = stateCtx.paneId ?? 'left';
  const paneLabel = stateCtx.paneLabel ?? 'File explorer';

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const active = stateCtx.isActivePane;

  const { itemsPerPage } = useSettings();
  const [currentPage, setCurrentPage] = useState(1);

  const sortedFiles = useMemo(() => {
    if (stateCtx.isSearchActive) {
      return [...initialFiles];
    }

    return [...initialFiles].sort((a, b) => {
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
  }, [initialFiles, stateCtx.isSearchActive, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleFiles = useMemo(
    () => sortedFiles.slice(startIndex, startIndex + itemsPerPage),
    [itemsPerPage, sortedFiles, startIndex],
  );
  const isEmpty = !stateCtx.isLoading && !stateCtx.errorMessage && sortedFiles.length === 0;

  const onSelectionChangeRef = useRef(actionCtx.onSelectionChange);
  onSelectionChangeRef.current = actionCtx.onSelectionChange;

  useEffect(() => {
    onSelectionChangeRef.current?.(visibleFiles[selectedIndex] ?? null);
  }, [selectedIndex, visibleFiles]);

  const navigateToPath = useCallback(async (path: string) => {
    if (actionCtx.navigateToPath) {
      try {
        await actionCtx.navigateToPath(path);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load folder:', error);
        }
        toast.error('Failed to load folder');
      }
    } else {
      // Fallback si no está disponible
      try {
        const nextFiles = await actionCtx.onLoadFolder(path);
        actionCtx.onPathChange?.(path, nextFiles);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load folder:', error);
        }
        toast.error('Failed to load folder');
      }
    }
  }, [actionCtx.navigateToPath, actionCtx.onLoadFolder, actionCtx.onPathChange]);

  const openItem = useCallback(async (item: FileItem) => {
    if (isFolder(item)) {
      await navigateToPath(item.path);
      return;
    }

    try {
      await openPath(toOpenablePath(item.path));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to open file:', error);
      }
      toast.error('Failed to open file');
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

  const setSelectedIndex = useCallback((nextIndex: number | ((i: number) => number)) => {
    const current = stateCtx.selectedIndex ?? 0;
    const next = typeof nextIndex === 'function' ? nextIndex(current) : nextIndex;

    if (next === current) {
      return;
    }

    actionCtx.onSelectedIndexChange?.(next);
  }, [stateCtx.selectedIndex, actionCtx.onSelectedIndexChange]);

  const setViewMode = useCallback((nextViewMode: ViewMode) => {
    if (nextViewMode === viewMode) {
      return;
    }

    actionCtx.onViewModeChange?.(nextViewMode);
  }, [viewMode, actionCtx.onViewModeChange]);

  const setSort = useCallback((nextSortBy: SortOption, nextSortOrder: SortOrder) => {
    if (nextSortBy === sortBy && nextSortOrder === sortOrder) {
      return;
    }

    actionCtx.onSortChange?.(nextSortBy, nextSortOrder);
  }, [sortBy, sortOrder, actionCtx.onSortChange]);

  const activatePane = useCallback(() => {
    actionCtx.onActivatePane?.(paneId);
  }, [actionCtx.onActivatePane, stateCtx.paneId]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIndex(0);
  }, [initialFiles, currentPath, sortBy, sortOrder]);

  const handleSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, [setSelectedIndex]);

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToRename || !newFileName.trim()) return;

    if (newFileName.trim() === fileToRename.name) {
      setRenameDialogOpen(false);
      return;
    }

    try {
      if (actionCtx.onRenameItem) {
        await actionCtx.onRenameItem(fileToRename, newFileName.trim());
      }
      setRenameDialogOpen(false);
      setFileToRename(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to rename item:', error);
      }
      toast.error('Failed to rename item');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !actionCtx.onDeleteItem) return;

    try {
      await actionCtx.onDeleteItem(fileToDelete);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to delete item:', error);
      }
      toast.error('Failed to delete item');
    }
  };

  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const visibleFilesRef = useRef(visibleFiles);
  visibleFilesRef.current = visibleFiles;

  const currentPathRef = useRef(currentPath);
  currentPathRef.current = currentPath;

  const setSelectedIndexRef = useRef(setSelectedIndex);
  setSelectedIndexRef.current = setSelectedIndex;

  const openItemRef = useRef(openItem);
  openItemRef.current = openItem;

  const navigateToPathRef = useRef(navigateToPath);
  navigateToPathRef.current = navigateToPath;

  const onTogglePreviewRef = useRef(actionCtx.onTogglePreview);
  onTogglePreviewRef.current = actionCtx.onTogglePreview;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (active === false) return;

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
          void openItemRef.current(selectedItem);
        }
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const parentPath = getParentPath(currentPathRef.current);
      if (parentPath !== '/' && parentPath !== currentPathRef.current) {
        void navigateToPathRef.current(parentPath);
      }
    } else if (e.key === ' ') {
      if (currentVisibleFiles.length > 0) {
        e.preventDefault();
        onTogglePreviewRef.current?.();
      }
    }
  }, [active]);

  const handleSort = useCallback((option: SortOption) => {
    if (stateCtx.isSearchActive) {
      return;
    }

    if (sortBy === option) {
      setSort(option, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(option, 'asc');
    }
  }, [stateCtx.isSearchActive, sortBy, sortOrder, setSort]);

  const sortHeaderClassName = stateCtx.isSearchActive
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
      onKeyDown={handleKeyDown}
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
              aria-label="View as List"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 text-muted-foreground hover:text-foreground ${
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''
              }`}
              title="View as Grid"
              aria-label="View as Grid"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </BreadcrumbPath>

        {viewMode === 'list' && (
          <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground select-none">
            <span className={sortHeaderClassName} onClick={() => handleSort('name')}>
              Name <SortIcon option="name" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={stateCtx.isSearchActive ?? false} />
            </span>
            <span className={sortHeaderClassName} onClick={() => handleSort('modified')}>
              Modified <SortIcon option="modified" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={stateCtx.isSearchActive ?? false} />
            </span>
            <span className={sortHeaderClassName} onClick={() => handleSort('type')}>
              Type <SortIcon option="type" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={stateCtx.isSearchActive ?? false} />
            </span>
            <span className={sortHeaderClassName} onClick={() => handleSort('size')}>
              Size <SortIcon option="size" sortBy={sortBy} sortOrder={sortOrder} isSearchActive={stateCtx.isSearchActive ?? false} />
            </span>
          </div>
        )}
      </div>

      {stateCtx.isLoading && (
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

      {stateCtx.errorMessage && !stateCtx.isLoading && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-5 px-6 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-destructive text-destructive">
            <AlertCircle className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-foreground tracking-tight">Ocurrió un problema</p>
            <p className="text-[13px] text-muted-foreground">{stateCtx.errorMessage}</p>
          </div>
          {actionCtx.onRetry && (
            <button
              type="button"
              onClick={() => {
                void actionCtx.onRetry?.();
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

      {!stateCtx.isLoading && !stateCtx.errorMessage && (
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
                  onRename={actionCtx.onRenameItem ? openRenameDialog : undefined}
                  onDelete={actionCtx.onDeleteItem ? openDeleteDialog : undefined}
                  onSelect={handleSelect}
                  onCopyToInactivePane={actionCtx.onCopyToInactivePane}
                  onMoveToInactivePane={actionCtx.onMoveToInactivePane}
                  onCreateWorkspace={actionCtx.onCreateWorkspace}
                  onCreateTag={actionCtx.onCreateTag}
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
                  onRename={actionCtx.onRenameItem ? openRenameDialog : undefined}
                  onDelete={actionCtx.onDeleteItem ? openDeleteDialog : undefined}
                  onSelect={handleSelect}
                  onCopyToInactivePane={actionCtx.onCopyToInactivePane}
                  onMoveToInactivePane={actionCtx.onMoveToInactivePane}
                  onCreateWorkspace={actionCtx.onCreateWorkspace}
                  onCreateTag={actionCtx.onCreateTag}
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



      {totalPages > 1 && !stateCtx.isLoading && !stateCtx.errorMessage && (
        <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-card px-4 py-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedFiles.length)} of {sortedFiles.length} items
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
