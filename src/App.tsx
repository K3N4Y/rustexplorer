import { InputGroupDemo } from "./components/SearchBar";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import "./App.css";
import FileExplorer from "./components/FileExplorer";

interface FileItem {
  name: string;
  path: string;
  size: number;
  modified: string | null;
  isDirectory: boolean;
}

function App() {
  const rootPath = "C:\\Users\\kenay\\OneDrive\\Desktop";
  const [files, setFiles] = useState<FileItem[]>([]);

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

  useEffect(() => {
    loadFolder(rootPath)
      .then(setFiles)
      .catch((error) => {
        console.error("Error loading initial folder:", error);
      });
  }, []);

  return (
    <main className="container">
      <InputGroupDemo />
      <FileExplorer initialFiles={files} initialPath={rootPath} onLoadFolder={loadFolder} />
    </main>
  );
}

export default App;
