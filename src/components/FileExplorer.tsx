import React, { useState } from 'react';
import { File as FileIcon, Folder as FolderIcon } from 'lucide-react';
import BreadcrumbPath from './BreadcrumbPath';
import type { FileItem } from './file-types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { useSettings } from '../lib/settings-provider';

// Props del componente
interface FileExplorerProps {
  initialFiles: FileItem[];
  initialPath?: string;
  onLoadFolder: (path: string) => Promise<FileItem[]>;
  onPathChange?: (path: string, files: FileItem[]) => void;
  onRenameItem?: (item: FileItem, newName: string) => Promise<void>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  initialFiles,
  initialPath = '/',
  onLoadFolder,
  onPathChange,
  onRenameItem,
}) => {
  const currentPath = initialPath;
  const files = initialFiles;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileItem | null>(null);
  const [newFileName, setNewFileName] = useState('');
  
  const { itemsPerPage } = useSettings();
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIndex(0);
  }, [initialFiles, currentPath]);

  const totalPages = Math.ceil(files.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleFiles = files.slice(startIndex, startIndex + itemsPerPage);

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
    } catch (error) {
      console.error('Error renaming item:', error);
      // Opcional: mostrar un estado de error en el UI del diálogo
    }
  };

  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
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
    <div className="w-full mx-auto border border-border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm">
      <BreadcrumbPath currentPath={currentPath} onNavigate={navigateToPath} />

      {/* Header */}
      <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] px-4 py-3 bg-muted/50 text-sm font-semibold text-muted-foreground border-b border-border">
        <span>Name</span>
        <span>Modified</span>
        <span>Type</span>
        <span>Size</span>
      </div>

      {/* Files List */}
      {visibleFiles.map((file, index) => {
        const folder = isFolder(file);
        const isSelected = selectedIndex === index;
        const isHovered = hoveredIndex === index;
        return (
          <ContextMenu key={index}>
            <ContextMenuTrigger asChild>
              <div
                className={`grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] px-4 py-3 border-b border-border/50 items-center cursor-pointer transition-colors duration-150 ${
                  isSelected ? 'bg-accent/80 text-accent-foreground' : isHovered ? 'bg-muted/50' : 'bg-transparent'
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => {
                  setSelectedIndex(index);
                  handleItemClick(file);
                }}
              >
                {/* Name + Icon */}
                <div className="flex items-center gap-2 truncate">
                  {folder ? (
                    <FolderIcon className="h-5 w-5 text-amber-500" strokeWidth={1.8} aria-hidden="true" />
                  ) : (
                    <FileIcon className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
                  )}
                  <span className="truncate text-sm font-medium">{file.name}</span>
                </div>

                {/* Modified */}
                <span className="text-sm text-muted-foreground">{formatDate(file.modified)}</span>

                {/* Type Badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                  {folder ? 'Directory' : 'File'}
                </span>

                {/* Size */}
                <span className="text-sm text-muted-foreground">{formatSize(file.size, folder)}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={() => handleItemClick(file)}>
                Abrir
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(file.path);
                  // Podrías añadir un toast aquí para feedback
                }}
              >
                Copiar ruta
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => {
                  if (onRenameItem) {
                    openRenameDialog(file);
                  }
                }}
              >
                Renombrar
              </ContextMenuItem>
              <ContextMenuItem disabled className="text-destructive">
                Eliminar (Próximamente)
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      {/* Back Button (if not at root) */}
      {currentPath !== '/' && (
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <button
            onClick={async () => {
              const parentPath = getParentPath(currentPath);
              await navigateToPath(parentPath);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border bg-card flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, files.length)} of {files.length} items
          </span>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-foreground font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Renombrar {fileToRename?.isDirectory ? 'carpeta' : 'archivo'}</DialogTitle>
            <DialogDescription>
              Introduce el nuevo nombre para "{fileToRename?.name}".
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit}>
            <div className="grid gap-4 py-4">
              <Input
                id="name"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                autoFocus
                className="col-span-3"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!newFileName.trim() || newFileName === fileToRename?.name}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileExplorer;