import React, { useState } from 'react';
import { File as FileIcon, Folder as FolderIcon } from 'lucide-react';
import BreadcrumbPath from './BreadcrumbPath';
import type { FileItem } from './file-types';

import { useSettings } from '../lib/settings-provider';

// Props del componente
interface FileExplorerProps {
  initialFiles: FileItem[];
  initialPath?: string;
  onLoadFolder: (path: string) => Promise<FileItem[]>;
  onPathChange?: (path: string, files: FileItem[]) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  initialFiles,
  initialPath = '/',
  onLoadFolder,
  onPathChange,
}) => {
  const currentPath = initialPath;
  const files = initialFiles;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  const { itemsPerPage } = useSettings();
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
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
    // Si es archivo, no hacemos nada (podrías agregar onClick para abrirlo)
  };

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
        return (
          <div
            key={index}
            className={`grid grid-cols-[1.6fr_1fr_0.8fr_0.6fr] px-4 py-3 border-b border-border/50 items-center cursor-pointer transition-colors duration-150 ${
              hoveredIndex === index ? 'bg-muted/50' : 'bg-transparent'
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleItemClick(file)}
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
    </div>
  );
};

export default FileExplorer;