import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FileItem } from "../components/file-types";
import { getParentPath } from "../lib/path-utils";

type FileRecord = {
  name: string;
  path: string;
  size: number;
  modified: string | null;
  is_dir: boolean;
};

type NavigateOptions = {
  recordHistory?: boolean;
};

export function useFilePaneNavigation(initialPath: string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [navigationHistory, setNavigationHistory] = useState({
    entries: [initialPath],
    index: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFolder = useCallback(async (path: string): Promise<FileItem[]> => {
    const response = await invoke<FileRecord[]>("get_files", { path });

    return response.map((item) => ({
      name: item.name,
      path: item.path,
      size: item.size,
      modified: item.modified,
      isDirectory: item.is_dir,
    }));
  }, []);

  const navigateToPath = useCallback(
    async (path: string, options?: NavigateOptions) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextFiles = await loadFolder(path);
        setFiles(nextFiles);
        setCurrentPath(path);

        if (options?.recordHistory !== false) {
          setNavigationHistory((previous) => {
            const nextHistory = previous.entries.slice(0, previous.index + 1);
            if (nextHistory[nextHistory.length - 1] === path) {
              return previous;
            }

            return {
              entries: [...nextHistory, path],
              index: nextHistory.length,
            };
          });
        }

        return nextFiles;
      } catch (error) {
        console.error("Error loading folder:", error);
        setErrorMessage("No se pudo cargar esta carpeta. Intenta de nuevo.");
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [loadFolder],
  );

  const renameItem = useCallback(
    async (item: FileItem, newName: string) => {
      await invoke("rename_file", {
        source_path: item.path,
        target_name: newName,
      });

      await navigateToPath(currentPath);
    },
    [currentPath, navigateToPath],
  );

  const deleteItem = useCallback(
    async (item: FileItem) => {
      await invoke("delete_file", {
        target_path: item.path,
      });

      await navigateToPath(currentPath);
    },
    [currentPath, navigateToPath],
  );

  const copyItemToDirectory = useCallback(
    async (item: FileItem, destinationDir: string) => {
      await invoke("copy_file", {
        source_path: item.path,
        destination_dir: destinationDir,
      });

      await navigateToPath(currentPath);
    },
    [currentPath, navigateToPath],
  );

  const moveItemToDirectory = useCallback(
    async (item: FileItem, destinationDir: string) => {
      await invoke("move_file", {
        source_path: item.path,
        destination_dir: destinationDir,
      });

      await navigateToPath(currentPath);
    },
    [currentPath, navigateToPath],
  );

  useEffect(() => {
    navigateToPath(initialPath).catch((error) => {
      console.error("Error loading initial folder:", error);
    });
  }, [navigateToPath, initialPath]);

  const parentPath = useMemo(() => getParentPath(currentPath), [currentPath]);
  const history = navigationHistory.entries;
  const historyIndex = navigationHistory.index;

  return {
    canGoBack: historyIndex > 0,
    canGoForward: historyIndex < history.length - 1,
    canGoUp: parentPath !== currentPath,
    currentPath,
    copyItemToDirectory,
    deleteItem,
    errorMessage,
    files,
    history,
    historyIndex,
    isLoading,
    loadFolder,
    navigateToPath,
    parentPath,
    moveItemToDirectory,
    renameItem,
    setCurrentPath,
    setFiles,
    setHistoryIndex: (index: number) => {
      setNavigationHistory((previous) => ({
        ...previous,
        index,
      }));
    },
  };
}

export function useFileNavigation(rootPath: string) {
  return useFilePaneNavigation(rootPath);
}
