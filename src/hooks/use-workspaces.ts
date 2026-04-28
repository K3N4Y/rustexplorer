import { useWorkspaceContext } from "@/lib/workspace-provider";

export function useWorkspaces() {
  const ctx = useWorkspaceContext();

  return {
    workspaces: ctx.appData?.workspaces ?? [],
    tags: ctx.appData?.tags ?? [],
    pathTags: ctx.appData?.path_tags ?? {},
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
