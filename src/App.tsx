import { InputGroupDemo } from "./components/SearchBar";
import { useState } from "react";
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
import { useFileNavigation } from "./hooks/use-file-navigation";
import { getPathLabel } from "./lib/path-utils";
import { Button } from "./components/ui/button";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { SettingsDialog } from "./components/settings-dialog";

function App() {
  const rootPath = "C:\\Users\\kenay\\OneDrive\\Desktop";
  const [isSearchActive, setIsSearchActive] = useState(false);
  const {
    canGoBack,
    canGoForward,
    canGoUp,
    currentPath,
    deleteItem,
    errorMessage,
    files,
    history,
    historyIndex,
    isLoading,
    loadFolder,
    navigateToPath,
    parentPath,
    renameItem,
    setCurrentPath,
    setFiles,
    setHistoryIndex,
  } = useFileNavigation(rootPath);

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

      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-4 py-3.5 sticky top-0 z-20">
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
              onSearchStateChange={setIsSearchActive}
              onSearchResults={(results) => setFiles(results)}
              onClearSearch={() => navigateToPath(currentPath, { recordHistory: false })}
            />
            <SettingsDialog />
          </div>
        </header>
        <main className="scrollbar-hidden w-full flex-1 overflow-auto bg-background">
          <div className="mx-auto w-full p-4 max-w-none">
            <FileExplorer
              initialFiles={files}
              initialPath={currentPath}
              isLoading={isLoading}
              isSearchActive={isSearchActive}
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
