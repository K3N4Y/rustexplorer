import React, { useState } from 'react';
import {
  AlertCircle,
  File as FileIcon,
  Folder as FolderIcon,
  FolderOpen,
  LoaderCircle,
  RefreshCcw,
} from 'lucide-react';
import BreadcrumbPath from './BreadcrumbPath';
import type { FileItem } from './file-types';
import { FileContextMenu } from './FileContextMenu';
import { RenameDialog } from './RenameDialog';
import { DeleteAlertDialog } from './DeleteAlertDialog';

import { useSettings } from '../lib/settings-provider';

interface FileExplorerProps {
  initialFiles: FileItem[];
  initialPath?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  onLoadFolder: (path: string) => Promise<FileItem[]>;
  onPathChange?: (path: string, files: FileItem[]) => void;
  onRenameItem?: (item: FileItem, newName: string) => Promise<void>;
  onDeleteItem?: (item: FileItem) => Promise<void>;
  onRetry?: () => Promise<unknown>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  initialFiles,
  initialPath = '/',
  isLoading = false,
  errorMessage = null,
  onLoadFolder,
  onPathChange,
  onRenameItem,
  onDeleteItem,
  onRetry,
}) => {
  const currentPath = initialPath;
  const files = initialFiles;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);

  const { itemsPerPage } = useSettings();
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIndex(0);
  }, [initialFiles, currentPath]);

  const totalPages = Math.ceil(files.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleFiles = files.slice(startIndex, startIndex + itemsPerPage);
  const isEmpty = !isLoading && !errorMessage && files.length === 0;

  const isFolder = (item: FileItem): boolean => item.isDirectory;

  const navigateToPath = async (path: string) => {
    try {
      const nextFiles = await onLoadFolder(path);
      onPathChange?.(path, nextFiles);
    } catch (error) {
      console.error('Error loading folder:', error);
    }
  };

  const handleItemClick = async (item: FileItem) => {
    if (isFolder(item)) {
      await navigateToPath(item.path);
    }
  };

  const openRenameDialog = (file: FileItem) => {
    setFileToRename(file);
    setNewFileName(file.name);
    setRenameDialogOpen(true);
  };

  const openDeleteDialog = (file: FileItem) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

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

  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (visibleFiles.length > 0) {
          setSelectedIndex((prev) => Math.min(prev + 1, visibleFiles.length - 1));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleFiles.length > 0) {
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (visibleFiles.length > 0 && document.activeElement?.tagName !== 'BUTTON') {
          const selectedItem = visibleFiles[selectedIndex];
          if (selectedItem) {
            await handleItemClick(selectedItem);
          }
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        const parentPath = getParentPath(currentPath);
        if (parentPath !== '/' && parentPath !== currentPath) {
          await navigateToPath(parentPath);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, visibleFiles, currentPath]);

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

  const getParentPath = (path: string): string => {
    const normalized = path.replace(/[\\/]+$/, '');
    const parts = normalized.split(/[\\/]+/);

    if (parts.length <= 1) {
      return '/';
    }

    const lastSegment = parts.pop();
    if (!lastSegment) {
      return '/';
    }

    if (parts.length === 1 && parts[0].endsWith(':')) {
      return `${parts[0]}\\`;
    }

    return parts.join('\\') || '/';
  };

  return (
    <div className="w-full mx-auto border border-border/50 rounded-xl overflow-hidden bg-card text-card-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/5">
      <BreadcrumbPath currentPath={currentPath} onNavigate={navigateToPath} />

      <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] border-b border-border/50 bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/78">
        <span>Name</span>
        <span>Modified</span>
        <span>Type</span>
        <span>Size</span>
      </div>

      {isLoading && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-12 text-center bg-card/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
            <LoaderCircle className="h-6 w-6 animate-spin" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold tracking-tight text-foreground">Cargando carpeta...</p>
            <p className="text-[13px] text-muted-foreground/80">Estamos obteniendo los archivos de esta ruta.</p>
          </div>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-5 px-6 py-12 text-center bg-card/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-sm border border-destructive/20">
            <AlertCircle className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-foreground tracking-tight">Ocurrió un problema</p>
            <p className="text-[13px] text-muted-foreground/80">{errorMessage}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={() => {
                void onRetry();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-[13px] font-semibold tracking-wide shadow-sm transition-all hover:bg-accent hover:text-accent-foreground active:scale-95"
            >
              <RefreshCcw className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              Reintentar
            </button>
          )}
        </div>
      )}

      {isEmpty && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-12 text-center bg-card/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/70 shadow-sm border border-border/50">
            <FolderOpen className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[15px] font-semibold text-foreground tracking-tight">Esta carpeta está vacía</p>
            <p className="text-[13px] text-muted-foreground/80">Cuando tenga archivos o subcarpetas, aparecerán aquí.</p>
          </div>
        </div>
      )}

      {!isLoading && !errorMessage && visibleFiles.map((file, index) => {
        const folder = isFolder(file);
        const isSelected = selectedIndex === index;
        const isHovered = hoveredIndex === index;

        return (
          <FileContextMenu
            key={file.path}
            file={file}
            onOpen={(file) => void handleItemClick(file)}
            onRename={() => {
              if (onRenameItem) openRenameDialog(file);
            }}
            onDelete={() => {
              if (onDeleteItem) openDeleteDialog(file);
            }}
          >
            <div
              className={`grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] px-5 py-3.5 border-b border-border/40 items-center cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-primary/5 text-foreground shadow-[inset_3px_0_0_0_theme(colors.primary)]'
                  : isHovered
                    ? 'bg-muted/40'
                    : 'bg-transparent'
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                setSelectedIndex(index);
                void handleItemClick(file);
              }}
            >
              <div className="flex items-center gap-3 truncate">
                {folder ? (
                  <div className="p-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-500 shadow-sm border border-amber-500/20">
                    <FolderIcon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                  </div>
                ) : (
                  <div className="p-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-zinc-500/10 text-zinc-500 shadow-sm border border-zinc-500/20">
                    <FileIcon
                      className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </div>
                )}
                <span className={`truncate leading-tight ${isSelected ? 'text-sm font-semibold tracking-tight text-foreground' : 'text-sm font-medium text-foreground/90'}`}>{file.name}</span>
              </div>

              <span className={`text-[13px] ${isSelected ? 'font-medium text-foreground/90' : 'text-muted-foreground'} tracking-tight`}>
                {formatDate(file.modified)}
              </span>

              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-sm ${
                  folder 
                    ? isSelected 
                      ? 'bg-amber-100/50 border-amber-200 text-amber-800 dark:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-200' 
                      : 'bg-amber-50 border-amber-100/50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-400'
                    : isSelected 
                      ? 'bg-zinc-100 border-zinc-200 text-zinc-800 dark:bg-zinc-800/60 dark:border-zinc-700 dark:text-zinc-200'
                      : 'bg-zinc-50 border-zinc-100 text-zinc-600 dark:bg-zinc-900/40 dark:border-zinc-800 dark:text-zinc-400'
                }`}
              >
                {folder ? 'DIRECTORY' : 'FILE'}
              </span>

              <span className={`text-[13px] font-medium tabular-nums ${isSelected ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                {formatSize(file.size, folder)}
              </span>
            </div>
          </FileContextMenu>
        );
      })}

      {currentPath !== '/' && !isLoading && !errorMessage && !isEmpty && (
        <div className="px-4 py-3 border-t border-border bg-muted/20">
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
        <div className="px-4 py-3 border-t border-border bg-card flex items-center justify-between">
          <span className="text-[12px] font-medium tracking-tight text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, files.length)} of {files.length} items
          </span>
          <div className="flex items-center gap-4 text-[13px]">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md bg-secondary px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="font-semibold tracking-tight text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md bg-secondary px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default FileExplorer;
