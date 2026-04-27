import { useMemo } from "react";
import { useWorkspace, useWorkspaces } from "@/hooks/use-workspaces";
import { TagChips } from "./tag-chips";
import type { Tag } from "@/lib/workspace-provider";

interface WorkspaceViewProps {
  workspaceId: string;
  onNavigate: (path: string) => void;
  onTagClick?: (tagId: string) => void;
}

export function WorkspaceView({ workspaceId, onNavigate, onTagClick }: WorkspaceViewProps) {
  const workspace = useWorkspace(workspaceId);
  const { tags, pathTags } = useWorkspaces();

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

  if (!workspace) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center text-muted-foreground">
        Workspace not found
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{
            backgroundColor: workspace.color ?? "transparent",
            border: workspace.color ? "none" : "1.5px solid currentColor",
          }}
        />
        <h2 className="text-lg font-medium">{workspace.name}</h2>
      </div>

      {workspaceTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {workspaceTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onTagClick?.(tag.id)}
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="divide-y divide-border">
        {workspace.paths.map((path) => {
          const filename = path.split(/[/\\]/).pop() ?? path;
          const itemTags = pathTagMap.get(path) ?? [];
          return (
            <button
              key={path}
              onClick={() => onNavigate(path)}
              className="flex w-full flex-col gap-1 py-3 text-left transition-colors hover:bg-muted px-2 rounded-md"
            >
              <span className="text-sm font-medium">{filename}</span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">{path}</span>
              {itemTags.length > 0 && <TagChips tags={itemTags} />}
            </button>
          );
        })}
        {workspace.paths.length === 0 && (
          <div className="py-8 text-center text-[13px] text-muted-foreground">
            This workspace is empty
          </div>
        )}
      </div>
    </div>
  );
}
