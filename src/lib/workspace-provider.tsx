import { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

export interface Workspace {
  id: string;
  name: string;
  color: string | null;
  paths: string[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface AppData {
  workspaces: Workspace[];
  tags: Tag[];
  path_tags: Record<string, string[]>;
}

interface WorkspaceContextType {
  appData: AppData | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  createWorkspace: (name: string, color?: string) => Promise<AppData | undefined>;
  renameWorkspace: (id: string, name: string) => Promise<AppData | undefined>;
  changeWorkspaceColor: (id: string, color?: string) => Promise<AppData | undefined>;
  deleteWorkspace: (id: string) => Promise<AppData | undefined>;
  addToWorkspace: (workspaceId: string, path: string) => Promise<AppData | undefined>;
  removeFromWorkspace: (workspaceId: string, path: string) => Promise<AppData | undefined>;
  createTag: (name: string, color: string) => Promise<AppData | undefined>;
  renameTag: (id: string, name: string) => Promise<AppData | undefined>;
  changeTagColor: (id: string, color: string) => Promise<AppData | undefined>;
  deleteTag: (id: string) => Promise<AppData | undefined>;
  addTagToPath: (tagId: string, path: string) => Promise<AppData | undefined>;
  removeTagFromPath: (tagId: string, path: string) => Promise<AppData | undefined>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [appData, setAppData] = useState<AppData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await invoke<AppData>("get_app_data");
      setAppData(data);
    } catch (e) {
      console.error("Failed to load workspace data:", e);
      toast.error("Failed to load workspace data");
    }
  };

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, []);

  const mutate = async (command: string, args?: Record<string, unknown>) => {
    try {
      const data = await invoke<AppData>(command, args);
      setAppData(data);
      return data;
    } catch (e) {
      console.error(`Failed to execute ${command}:`, e);
      toast.error(`Failed to execute ${command}`);
    }
  };

  const value: WorkspaceContextType = {
    appData,
    isLoading,
    refresh,
    createWorkspace: (name, color) => mutate("create_workspace", { name, color }) as Promise<AppData | undefined>,
    renameWorkspace: (id, name) => mutate("rename_workspace", { id, name }) as Promise<AppData | undefined>,
    changeWorkspaceColor: (id, color) => mutate("change_workspace_color", { id, color }) as Promise<AppData | undefined>,
    deleteWorkspace: (id) => mutate("delete_workspace", { id }) as Promise<AppData | undefined>,
    addToWorkspace: (workspaceId, path) => mutate("add_to_workspace", { workspaceId, path }) as Promise<AppData | undefined>,
    removeFromWorkspace: (workspaceId, path) => mutate("remove_from_workspace", { workspaceId, path }) as Promise<AppData | undefined>,
    createTag: (name, color) => mutate("create_tag", { name, color }) as Promise<AppData | undefined>,
    renameTag: (id, name) => mutate("rename_tag", { id, name }) as Promise<AppData | undefined>,
    changeTagColor: (id, color) => mutate("change_tag_color", { id, color }) as Promise<AppData | undefined>,
    deleteTag: (id) => mutate("delete_tag", { id }) as Promise<AppData | undefined>,
    addTagToPath: (tagId, path) => mutate("add_tag_to_path", { tagId, path }) as Promise<AppData | undefined>,
    removeTagFromPath: (tagId, path) => mutate("remove_tag_from_path", { tagId, path }) as Promise<AppData | undefined>,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  return ctx;
}
