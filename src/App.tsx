import { InputGroupDemo } from "./components/SearchBar";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  FolderOpen,
  RefreshCcw,
} from "lucide-react";
import "./App.css";
import FileExplorer from "./components/FileExplorer";
import FileTreeSidebar from "./components/FileTreeSidebar";
import type { FileItem } from "./components/file-types";
import { Button } from "./components/ui/button";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { SettingsDialog } from "./components/settings-dialog";

function getParentPath(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]+/);

  if (parts.length <= 1) {
    return path;
  }

  const lastSegment = parts.pop();
  if (!lastSegment) {
    return path;
  }

  if (parts.length === 1 && parts[0].endsWith(":")) {
    return `${parts[0]}\\`;
  }

  return parts.join("\\") || path;
}

function getPathLabel(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function App() {
  const rootPath = "C:\\Users\\kenay\\OneDrive\\Desktop";
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(rootPath);
  const [history, setHistory] = useState<string[]>([rootPath]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadFolder(path: string): Promise<FileItem[]> {
    const response = await invoke<Array<{
      name: string;
      path: string;
      size: number;
      modified: string | null;
      is_dir: boolean;
    }>>("get_files", { path });

    return response.map((item) => ({
      name: item.name,
      path: item.path,
      size: item.size,
      modified: item.modified,
      isDirectory: item.is_dir,
    }));
  }

  const navigateToPath = async (path: string, options?: { recordHistory?: boolean }) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextFiles = await loadFolder(path);
      setFiles(nextFiles);
      setCurrentPath(path);

      if (options?.recordHistory !== false) {
        const nextHistory = history.slice(0, historyIndex + 1);
        if (nextHistory[nextHistory.length - 1] !== path) {
          setHistory([...nextHistory, path]);
          setHistoryIndex(nextHistory.length);
        }
      }

      return nextFiles;
    } catch (error) {
      console.error("Error loading folder:", error);
      setErrorMessage("No se pudo cargar esta carpeta. Intenta de nuevo.");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const renameItem = async (item: FileItem, newName: string) => {
    await invoke("rename_file", {
      source_path: item.path,
      target_name: newName,
    });

    await navigateToPath(currentPath);
  };

  const deleteItem = async (item: FileItem) => {
    await invoke("delete_file", {
      target_path: item.path,
    });

    await navigateToPath(currentPath);
  };

  useEffect(() => {
    navigateToPath(rootPath)
      .catch((error) => {
        console.error("Error loading initial folder:", error);
      });
  }, []);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const parentPath = getParentPath(currentPath);
  const canGoUp = parentPath !== currentPath;

  const handleGoBack = async () => {
    if (!canGoBack) return;
    const nextIndex = historyIndex - 1;
    await navigateToPath(history[nextIndex], { recordHistory: false });
    setHistoryIndex(nextIndex);
  };

  const handleGoForward = async () => {
    if (!canGoForward) return;
    const nextIndex = historyIndex + 1;
    await navigateToPath(history[nextIndex], { recordHistory: false });
    setHistoryIndex(nextIndex);
  };

  const handleGoUp = async () => {
    if (!canGoUp) return;
    await navigateToPath(parentPath);
  };

  const handleRefresh = async () => {
    await navigateToPath(currentPath, { recordHistory: false });
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <FileTreeSidebar
          rootPath={rootPath}
          currentPath={currentPath}
          onLoadFolder={loadFolder}
          onNavigate={navigateToPath}
        />
      </Sidebar>

      <SidebarInset>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleGoBack();
                  }}
                  disabled={!canGoBack || isLoading}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleGoForward();
                  }}
                  disabled={!canGoForward || isLoading}
                  aria-label="Go forward"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleGoUp();
                  }}
                  disabled={!canGoUp || isLoading}
                  aria-label="Go up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    void handleRefresh();
                  }}
                  disabled={isLoading}
                  aria-label="Refresh folder"
                >
                  <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-foreground/65" />
                  <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
                    {getPathLabel(currentPath)}
                  </h1>
                </div>
                <p
                  className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80"
                  title={currentPath}
                >
                  {currentPath}
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full items-center gap-3 md:w-auto">
            <InputGroupDemo 
              currentPath={currentPath}
              onSearchResults={(results) => setFiles(results)}
              onClearSearch={() => navigateToPath(currentPath, { recordHistory: false })}
            />
            <SettingsDialog />
          </div>
        </header>
        <main className="w-full flex-1 overflow-auto px-4 py-4">
          <div className="mx-auto w-full max-w-none">
            <FileExplorer
              initialFiles={files}
              initialPath={currentPath}
              isLoading={isLoading}
              errorMessage={errorMessage}
              onLoadFolder={loadFolder}
              onRenameItem={renameItem}
              onDeleteItem={deleteItem}
              onRetry={() => navigateToPath(currentPath)}
              onPathChange={(path, nextFiles) => {
                setCurrentPath(path);
                setFiles(nextFiles);
              }}
            />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default App;
