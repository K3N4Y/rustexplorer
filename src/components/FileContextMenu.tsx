import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { FileItem } from './file-types';

interface FileContextMenuProps {
  file: FileItem;
  children: React.ReactNode;
  onOpen: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onCopyToInactivePane?: (file: FileItem) => void;
  onMoveToInactivePane?: (file: FileItem) => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  file,
  children,
  onOpen,
  onRename,
  onDelete,
  onCopyToInactivePane,
  onMoveToInactivePane,
}) => {
  const hasTransferActions = onCopyToInactivePane || onMoveToInactivePane;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onOpen(file)}>
          Abrir
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(file.path);
          }}
        >
          Copiar ruta
        </ContextMenuItem>
        {hasTransferActions && <ContextMenuSeparator />}
        {onCopyToInactivePane && (
          <ContextMenuItem onClick={() => onCopyToInactivePane(file)}>
            Copiar al otro panel
          </ContextMenuItem>
        )}
        {onMoveToInactivePane && (
          <ContextMenuItem onClick={() => onMoveToInactivePane(file)}>
            Mover al otro panel
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            if (onRename) onRename(file);
          }}
        >
          Renombrar
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            if (onDelete) onDelete(file);
          }}
        >
          Eliminar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
