import { useWorkspaceContext } from "@/lib/workspace-provider";
import type { Tag, Workspace } from "@/lib/workspace-provider";

const EMPTY_WORKSPACES: Workspace[] = [];
const EMPTY_TAGS: Tag[] = [];
const EMPTY_PATH_TAGS: Record<string, string[]> = {};

export function useWorkspaces() {
  const ctx = useWorkspaceContext();

  return {
    workspaces: ctx.appData?.workspaces ?? EMPTY_WORKSPACES,
    tags: ctx.appData?.tags ?? EMPTY_TAGS,
    pathTags: ctx.appData?.path_tags ?? EMPTY_PATH_TAGS,
    isLoading: ctx.isLoading,
    createWorkspace: ctx.createWorkspace,
    renameWorkspace: ctx.renameWorkspace,
    changeWorkspaceColor: ctx.changeWorkspaceColor,
    deleteWorkspace: ctx.deleteWorkspace,
    addToWorkspace: ctx.addToWorkspace,
    removeFromWorkspace: ctx.removeFromWorkspace,
    createTag: ctx.createTag,
    renameTag: ctx.renameTag,
    changeTagColor: ctx.changeTagColor,
    deleteTag: ctx.deleteTag,
    addTagToPath: ctx.addTagToPath,
    removeTagFromPath: ctx.removeTagFromPath,
  };
}

export function useWorkspace(workspaceId: string | null) {
  const { workspaces } = useWorkspaces();
  return workspaces.find((w) => w.id === workspaceId) ?? null;
}

export function usePathsByTag(tagId: string | null) {
  const { pathTags } = useWorkspaces();
  if (!tagId) return [];
  return Object.entries(pathTags)
    .filter(([, ids]) => ids.includes(tagId))
    .map(([path]) => path);
}
