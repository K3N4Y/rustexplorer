import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Check } from 'lucide-react';
import type { FileItem } from './file-types';
import { useWorkspaces } from '@/hooks/use-workspaces';

interface FileContextMenuProps {
  file: FileItem;
  children: React.ReactNode;
  onOpen: (file: FileItem) => void;
  onRename?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onCopyToInactivePane?: (file: FileItem) => void;
  onMoveToInactivePane?: (file: FileItem) => void;
  onCreateWorkspace?: () => void;
  onCreateTag?: () => void;
}

export const FileContextMenu: React.FC<FileContextMenuProps> = ({
  file,
  children,
  onOpen,
  onRename,
  onDelete,
  onCopyToInactivePane,
  onMoveToInactivePane,
  onCreateWorkspace,
  onCreateTag,
}) => {
  const hasTransferActions = onCopyToInactivePane || onMoveToInactivePane;
  const { workspaces, tags, pathTags, addToWorkspace, removeFromWorkspace, addTagToPath, removeTagFromPath } = useWorkspaces();

  const selectedPaths = [file.path];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
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
        
        {/* Add to Workspace submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>Agregar a Workspace</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {workspaces.map((ws) => {
              const isInWorkspace = selectedPaths.every((p) => ws.paths.includes(p));
              return (
                <ContextMenuItem
                  key={ws.id}
                  onClick={() => {
                    selectedPaths.forEach((path) => {
                      if (isInWorkspace) {
                        void removeFromWorkspace(ws.id, path);
                      } else {
                        void addToWorkspace(ws.id, path);
                      }
                    });
                  }}
                >
                  {isInWorkspace && <Check className="h-3 w-3 mr-2" />}
                  <span
                    className="h-2 w-2 rounded-full mr-2"
                    style={{ backgroundColor: ws.color ?? '#ccc' }}
                  />
                  {ws.name}
                </ContextMenuItem>
              );
            })}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onCreateWorkspace?.()}>
              Crear nuevo workspace...
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Tag with submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>Etiquetar con</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {tags.map((tag) => {
              const isTagged = selectedPaths.every((p) => (pathTags[p] ?? []).includes(tag.id));
              return (
                <ContextMenuItem
                  key={tag.id}
                  onClick={() => {
                    selectedPaths.forEach((path) => {
                      if (isTagged) {
                        void removeTagFromPath(tag.id, path);
                      } else {
                        void addTagToPath(tag.id, path);
                      }
                    });
                  }}
                >
                  {isTagged && <Check className="h-3 w-3 mr-2" />}
                  <span
                    className="h-2 w-2 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </ContextMenuItem>
              );
            })}
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onCreateTag?.()}>
              Crear nueva etiqueta...
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

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
