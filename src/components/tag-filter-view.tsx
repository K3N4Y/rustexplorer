import { useMemo } from "react";
import { usePathsByTag, useWorkspaces } from "@/hooks/use-workspaces";
import { TagChips } from "./tag-chips";
import type { Tag } from "@/lib/workspace-provider";

interface TagFilterViewProps {
  tagId: string;
  onNavigate: (path: string) => void;
}

export function TagFilterView({ tagId, onNavigate }: TagFilterViewProps) {
  const paths = usePathsByTag(tagId);
  const { tags, pathTags } = useWorkspaces();

  const tag = tags.find((t) => t.id === tagId);

  const pathTagMap = useMemo(() => {
    const map = new Map<string, Tag[]>();
    for (const path of paths) {
      const tagIds = pathTags[path] ?? [];
      map.set(path, tags.filter((t) => tagIds.includes(t.id)));
    }
    return map;
  }, [paths, tags, pathTags]);

  if (!tag) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center text-muted-foreground">
        Tag not found
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
        <h2 className="text-lg font-medium">#{tag.name}</h2>
      </div>

      <div className="divide-y divide-border">
        {paths.map((path) => {
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
        {paths.length === 0 && (
          <div className="py-8 text-center text-[13px] text-muted-foreground">
            No files with this tag
          </div>
        )}
      </div>
    </div>
  );
}
