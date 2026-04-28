import { useMemo, useCallback } from "react";
import { FolderPlus, Pencil, Plus, SwatchBook, Trash2, X } from "lucide-react";
import { useWorkspace, useWorkspaces } from "@/hooks/use-workspaces";
import { TagChips } from "./tag-chips";
import type { Tag } from "@/lib/workspace-provider";

interface WorkspaceViewProps {
  workspaceId: string;
  currentPath?: string;
  selectedItemPath?: string | null;
  onNavigate: (path: string) => void;
  onTagClick?: (tagId: string) => void;
  onRenameWorkspace?: () => void;
  onDeleteWorkspace?: () => void;
  onChangeWorkspaceColor?: () => void;
  onBackToFiles?: (path: string) => void;
}

function getPathName(path: string) {
  return path.split(/[/\\]/).pop() ?? path;
}

function getParentLabel(path: string) {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : "Root";
}

export function WorkspaceView({
  workspaceId,
  currentPath,
  selectedItemPath,
  onNavigate,
  onTagClick,
  onRenameWorkspace,
  onDeleteWorkspace,
  onChangeWorkspaceColor,
  onBackToFiles,
}: WorkspaceViewProps) {
  const workspace = useWorkspace(workspaceId);
  const { tags, pathTags, addToWorkspace, removeFromWorkspace } = useWorkspaces();

  const pathTagMap = useMemo(() => {
    const map = new Map<string, Tag[]>();
    if (!workspace) return map;
    for (const path of workspace.paths) {
      const tagIds = pathTags[path] ?? [];
      map.set(path, tags.filter((t) => tagIds.includes(t.id)));
    }
    return map;
  }, [workspace, tags, pathTags]);

  const workspaceTags = useMemo(() => {
    if (!workspace) return [];
    const ids = new Set<string>();
    for (const path of workspace.paths) {
      (pathTags[path] ?? []).forEach((id) => ids.add(id));
    }
    return tags.filter((t) => ids.has(t.id));
  }, [workspace, tags, pathTags]);

  const handleAddCurrentFolder = useCallback(() => {
    if (!workspace || !currentPath) return;
    void addToWorkspace(workspace.id, currentPath);
  }, [addToWorkspace, currentPath, workspace]);

  const handleAddSelectedItem = useCallback(() => {
    if (!workspace || !selectedItemPath) return;
    void addToWorkspace(workspace.id, selectedItemPath);
  }, [addToWorkspace, selectedItemPath, workspace]);

  const handleRemovePath = useCallback(
    (path: string) => {
      if (!workspace) return;
      void removeFromWorkspace(workspace.id, path);
    },
    [removeFromWorkspace, workspace]
  );

  const groupedPaths = useMemo(() => {
    if (!workspace) return [];
    const groups = new Map<string, string[]>();

    for (const path of workspace.paths) {
      const label = getParentLabel(path);
      const paths = groups.get(label) ?? [];
      paths.push(path);
      groups.set(label, paths);
    }

    return Array.from(groups.entries()).map(([label, paths]) => ({
      label,
      paths: paths.sort((left, right) => getPathName(left).localeCompare(getPathName(right))),
    }));
  }, [workspace]);

  if (!workspace) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Workspace not found</p>
          <p className="text-[13px] text-muted-foreground">This workspace may have been deleted.</p>
        </div>
        <button
          type="button"
          onClick={() => currentPath && onBackToFiles?.(currentPath)}
          disabled={!currentPath}
          aria-label="Back to current folder"
          className="rounded-md border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to current folder
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: workspace.color ?? "transparent",
                border: workspace.color ? "none" : "1.5px solid currentColor",
              }}
            />
            <h2 className="truncate text-xl font-semibold tracking-tight">{workspace.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <span>{workspace.paths.length} paths</span>
            <span>{workspaceTags.length} tags</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleAddCurrentFolder} disabled={!currentPath} aria-label="Add current folder" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
            Current
          </button>
          <button type="button" onClick={handleAddSelectedItem} disabled={!selectedItemPath} aria-label="Add selected item" title={selectedItemPath ?? "No selected item"} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Selected
          </button>
          <button type="button" onClick={onRenameWorkspace} aria-label="Rename workspace" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onChangeWorkspaceColor} aria-label="Change workspace color" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <SwatchBook className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={onDeleteWorkspace} aria-label="Delete workspace" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {workspaceTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {workspaceTags.map((tag) => (
            <button key={tag.id} onClick={() => onTagClick?.(tag.id)} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-80" style={{ backgroundColor: tag.color }}>
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {workspace.paths.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">This workspace is empty</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">Add the current folder, add the selected item, or drag folders into this workspace from the sidebar.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedPaths.map((group) => (
            <section key={group.label} className="space-y-2">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h3>
              <div className="divide-y divide-border">
                {group.paths.map((path) => {
                  const filename = getPathName(path);
                  const itemTags = pathTagMap.get(path) ?? [];
                  return (
                    <div key={path} className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/60">
                      <button onClick={() => onNavigate(path)} className="min-w-0 flex-1 space-y-1 text-left">
                        <span className="block truncate text-sm font-medium">{filename}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">{path}</span>
                        {itemTags.length > 0 && <TagChips tags={itemTags} />}
                      </button>
                      <button type="button" onClick={() => handleRemovePath(path)} aria-label={`Remove ${filename} from workspace`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
