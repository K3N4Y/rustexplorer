import { InputGroupDemo } from "./components/SearchBar";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import "./App.css";
import FileExplorer from "./components/FileExplorer";
import FileTreeSidebar from "./components/FileTreeSidebar";
import type { FileItem } from "./components/file-types";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { SettingsDialog } from "./components/settings-dialog";

function App() {
  const rootPath = "C:\\Users\\kenay\\OneDrive\\Desktop";
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(rootPath);

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

  const navigateToPath = async (path: string) => {
    const nextFiles = await loadFolder(path);
    setFiles(nextFiles);
    setCurrentPath(path);
    return nextFiles;
  };

  useEffect(() => {
    navigateToPath(rootPath)
      .catch((error) => {
        console.error("Error loading initial folder:", error);
      });
  }, []);

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
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold text-sm">File Explorer</h1>
          </div>
          <div className="flex w-1/3 min-w-[200px] max-w-sm items-center gap-4">
            <InputGroupDemo 
              currentPath={currentPath}
              onSearchResults={(results) => setFiles(results)}
            />
            <SettingsDialog />
          </div>
        </header>
        <main className="w-full flex-1 overflow-auto px-4 py-4">
          <div className="mx-auto w-full max-w-none">
            <FileExplorer
              initialFiles={files}
              initialPath={currentPath}
              onLoadFolder={loadFolder}
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
