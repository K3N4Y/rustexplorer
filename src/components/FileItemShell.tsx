import React from 'react';
import { FileContextMenu } from './FileContextMenu';
import type { FileItem } from './file-types';

export interface FileItemShellProps {
  file: FileItem;
  index: number;
  className: string;
  children: React.ReactNode;
  onOpen: (item: FileItem) => Promise<void>;
  onRename?: (item: FileItem) => void;
  onDelete?: (item: FileItem) => void;
  onSelect: (index: number) => void;
  onCopyToInactivePane?: (item: FileItem) => void;
  onMoveToInactivePane?: (item: FileItem) => void;
  onCreateWorkspace?: () => void;
  onCreateTag?: () => void;
}

const FileItemShell: React.FC<FileItemShellProps> = ({
  file,
  index,
  className,
  children,
  onOpen,
  onRename,
  onDelete,
  onSelect,
  onCopyToInactivePane,
  onMoveToInactivePane,
  onCreateWorkspace,
  onCreateTag,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', file.path);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <FileContextMenu
      file={file}
      onOpen={(item) => void onOpen(item)}
      onRename={() => {
        onRename?.(file);
      }}
      onDelete={() => {
        onDelete?.(file);
      }}
      onCopyToInactivePane={onCopyToInactivePane}
      onMoveToInactivePane={onMoveToInactivePane}
      onCreateWorkspace={onCreateWorkspace}
      onCreateTag={onCreateTag}
    >
      <div
        className={className}
        draggable
        onDragStart={handleDragStart}
        onClick={() => {
          onSelect(index);
        }}
        onDoubleClick={() => {
          onSelect(index);
          void onOpen(file);
        }}
      >
        {children}
      </div>
    </FileContextMenu>
  );
};

export default React.memo(FileItemShell);
