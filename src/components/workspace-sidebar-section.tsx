import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight, Briefcase } from "lucide-react";
import { useWorkspaces } from "@/hooks/use-workspaces";
import type { Workspace } from "@/lib/workspace-provider";
import { getPathLabel } from "@/lib/path-utils";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";

interface WorkspaceSidebarSectionProps {
  onNavigate: (path: string) => void;
  onOpenWorkspace: (workspace: Workspace) => void;
  onRenameWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
}

export function WorkspaceSidebarSection({
  onNavigate,
  onOpenWorkspace,
  onRenameWorkspace,
  onCreateWorkspace,
}: WorkspaceSidebarSectionProps) {
  const { workspaces, addToWorkspace, deleteWorkspace } = useWorkspaces();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDropOnWorkspace = useCallback(
    (e: React.DragEvent, workspaceId: string) => {
      e.preventDefault();
      const path = e.dataTransfer.getData("text/plain");
      if (path) {
        void addToWorkspace(workspaceId, path);
      }
    },
    [addToWorkspace]
  );

  const handleDropOnZone = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const path = e.dataTransfer.getData("text/plain");
      if (path) {
        onCreateWorkspace();
      }
    },
    [onCreateWorkspace]
  );

  if (workspaces.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="h-4 w-4 text-foreground" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
            Workspaces
          </span>
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnZone}
          className="rounded-md border border-dashed border-border px-3 py-4 text-center text-[12px] text-muted-foreground transition-colors hover:border-ring hover:bg-muted"
        >
          Drop here to create new workspace
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="h-4 w-4 text-foreground" />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
          Workspaces
        </span>
      </div>
      <div className="space-y-0.5">
        {workspaces.map((workspace) => {
          const isExpanded = expandedIds.has(workspace.id);
          return (
            <ContextMenu key={workspace.id}>
              <ContextMenuTrigger asChild>
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => void handleDropOnWorkspace(e, workspace.id)}
                  className="select-none"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(workspace.id)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-200 ${
                      isExpanded
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: workspace.color ?? "transparent",
                        border: workspace.color
                          ? "none"
                          : "1.5px solid currentColor",
                      }}
                    />
                    <span className="truncate">{workspace.name}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-5 space-y-0.5 py-0.5">
                      {workspace.paths.map((path) => (
                        <button
                          key={path}
                          type="button"
                          onClick={() => onNavigate(path)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title={path}
                        >
                          <span className="truncate">
                            {getPathLabel(path)}
                          </span>
                        </button>
                      ))}
                      {workspace.paths.length === 0 && (
                        <div className="px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          Empty
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onSelect={() => {
                    onOpenWorkspace(workspace);
                  }}
                >
                  Open workspace
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => {
                    onRenameWorkspace(workspace);
                  }}
                >
                  Rename
                </ContextMenuItem>
                <ContextMenuItem
                  variant="destructive"
                  onSelect={() => {
                    void deleteWorkspace(workspace.id);
                  }}
                >
                  Delete workspace
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
      <div
        onDragOver={handleDragOver}
        onDrop={handleDropOnZone}
        className="mt-2 rounded-md border border-dashed border-border px-3 py-2 text-center text-[11px] text-muted-foreground transition-colors hover:border-ring hover:bg-muted"
      >
        Drop here to create new workspace
      </div>
    </div>
  );
}
