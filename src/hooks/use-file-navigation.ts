import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";
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
  const currentPathRef = useRef(initialPath);
  const latestNavigationRequestRef = useRef(0);
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

  const updateCurrentPath = useCallback((path: SetStateAction<string>) => {
    setCurrentPath((previousPath) => {
      const nextPath = typeof path === "function" ? path(previousPath) : path;
      currentPathRef.current = nextPath;
      return nextPath;
    });
  }, []);

  const navigateToPath = useCallback(
    async (path: string, options?: NavigateOptions) => {
      const navigationRequest = latestNavigationRequestRef.current + 1;
      latestNavigationRequestRef.current = navigationRequest;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextFiles = await loadFolder(path);
        if (latestNavigationRequestRef.current !== navigationRequest) {
          return nextFiles;
        }

        setFiles(nextFiles);
        updateCurrentPath(path);

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
        if (latestNavigationRequestRef.current === navigationRequest) {
          setErrorMessage("No se pudo cargar esta carpeta. Intenta de nuevo.");
        }
        throw error;
      } finally {
        if (latestNavigationRequestRef.current === navigationRequest) {
          setIsLoading(false);
        }
      }
    },
    [loadFolder, updateCurrentPath],
  );

  const resetToInitialPath = useCallback(async () => {
    updateCurrentPath(initialPath);
    setNavigationHistory({
      entries: [initialPath],
      index: 0,
    });
    await navigateToPath(initialPath, { recordHistory: false });
    setNavigationHistory({
      entries: [initialPath],
      index: 0,
    });
  }, [initialPath, navigateToPath, updateCurrentPath]);

  const renameItem = useCallback(
    async (item: FileItem, newName: string) => {
      await invoke("rename_file", {
        source_path: item.path,
        target_name: newName,
      });

      await navigateToPath(currentPathRef.current);
    },
    [navigateToPath],
  );

  const deleteItem = useCallback(
    async (item: FileItem) => {
      await invoke("delete_file", {
        target_path: item.path,
      });

      await navigateToPath(currentPathRef.current);
    },
    [navigateToPath],
  );

  const copyItemToDirectory = useCallback(
    async (item: FileItem, destinationDir: string) => {
      await invoke("copy_file", {
        source_path: item.path,
        destination_dir: destinationDir,
      });

      await navigateToPath(currentPathRef.current);
    },
    [navigateToPath],
  );

  const moveItemToDirectory = useCallback(
    async (item: FileItem, destinationDir: string) => {
      await invoke("move_file", {
        source_path: item.path,
        destination_dir: destinationDir,
      });

      await navigateToPath(currentPathRef.current);
    },
    [navigateToPath],
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
    resetToInitialPath,
    renameItem,
    setCurrentPath: updateCurrentPath,
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
