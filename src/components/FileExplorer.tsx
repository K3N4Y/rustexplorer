import React, { useState } from 'react';

// Interfaz para cada archivo/carpeta
interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: string | null;
  isDirectory: boolean;
}

// Props del componente
interface FileExplorerProps {
  initialFiles: FileItem[];
  initialPath?: string;
  onLoadFolder: (path: string) => Promise<FileItem[]>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  initialFiles,
  initialPath = '/',
  onLoadFolder,
}) => {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [currentPath, setCurrentPath] = useState<string>(initialPath);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  React.useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const isFolder = (item: FileItem): boolean => item.isDirectory;

  const handleItemClick = async (item: FileItem) => {
    if (isFolder(item)) {
      try {
        const newFiles = await onLoadFolder(item.path);
        setFiles(newFiles);
        setCurrentPath(item.path);
      } catch (error) {
        console.error('Error loading folder:', error);
      }
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
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <div className="grid grid-cols-[40px_1fr_120px_100px_150px_150px_40px] px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-600 border-b border-gray-200">
        <input type="checkbox" className="w-4 h-4" />
        <span>Nombre</span>
        <span>Tipo</span>
        <span>Tamaño</span>
        <span>Modificado</span>
        <span>Ruta</span>
        <span></span>
      </div>

      {/* Files List */}
      {files.map((file, index) => {
        const folder = isFolder(file);
        return (
          <div
            key={index}
            className={`grid grid-cols-[40px_1fr_120px_100px_150px_150px_40px] px-4 py-3 border-b border-gray-100 items-center cursor-pointer transition-colors duration-150 ${
              hoveredIndex === index ? 'bg-gray-50' : 'bg-white'
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onClick={() => handleItemClick(file)}
          >
            <input type="checkbox" className="w-4 h-4" />
            
            {/* Name + Icon */}
            <div className="flex items-center gap-2 truncate">
              <span className="text-lg">{folder ? '📁' : '📄'}</span>
              <span className="truncate text-sm text-gray-800">{file.name}</span>
            </div>

            {/* Type Badge */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {folder ? 'Carpeta' : 'Archivo'}
            </span>

            {/* Size */}
            <span className="text-sm text-gray-600">{formatSize(file.size, folder)}</span>

            {/* Modified */}
            <span className="text-sm text-gray-600">{formatDate(file.modified)}</span>

            {/* Path */}
            <span className="text-xs text-gray-500 truncate">{file.path}</span>

            {/* Menu Dots */}
            <div className="text-right text-gray-400 hover:text-gray-600">⋮</div>
          </div>
        );
      })}

      {/* Back Button (if not at root) */}
      {currentPath !== '/' && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={async () => {
              const parentPath = getParentPath(currentPath);
              try {
                const parentFiles = await onLoadFolder(parentPath);
                setFiles(parentFiles);
                setCurrentPath(parentPath);
              } catch (err) {
                console.error('Error going back:', err);
              }
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            ← Volver
          </button>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;