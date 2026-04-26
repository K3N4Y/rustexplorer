import React from 'react';
import { File as FileIcon, Folder as FolderIcon } from 'lucide-react';
import type { FileItem } from './file-types';
import { getFileAppearance } from '../lib/file-appearance';

interface FileIconProps {
  file: FileItem;
  selected: boolean;
  size: 'sm' | 'lg';
}

const FileIconComponent: React.FC<FileIconProps> = ({ file, selected, size }) => {
  const appearance = getFileAppearance(file);
  const dimensionClassName = size === 'sm' ? 'h-7 w-7 rounded-md' : 'h-14 w-14 rounded-xl';
  const iconSizeClassName = size === 'sm' ? 'h-4 w-4' : 'h-7 w-7';

  if (file.isDirectory) {
    return (
      <div
        className={`relative flex items-center justify-center border ${dimensionClassName} ${
          selected
            ? 'bg-transparent text-foreground border-foreground'
            : 'bg-transparent text-muted-foreground border-border-visible'
        }`}
      >
        <FolderIcon
          className={size === 'sm' ? 'h-4 w-4' : 'h-7 w-7'}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center border bg-transparent text-muted-foreground ${dimensionClassName} ${
        selected ? 'border-foreground text-foreground' : 'border-border-visible'
      }`}
    >
      {appearance.iconSrc ? (
        <img
          src={appearance.iconSrc}
          alt=""
          className={size === 'sm' ? 'h-5 w-5' : 'h-10 w-10'}
          draggable={false}
        />
      ) : (
        <FileIcon
          className={`${iconSizeClassName} ${selected ? 'text-primary' : 'text-muted-foreground'}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default React.memo(FileIconComponent);
