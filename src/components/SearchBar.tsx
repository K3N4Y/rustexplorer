import { LoaderCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FileItem } from "./file-types";
import { useSettings } from "../lib/settings-provider";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const DEFAULT_SEARCH_LIMIT = 200;
const SEARCH_DEBOUNCE_MS = 100;
const RESULT_FLUSH_MS = 80;

interface InputGroupDemoProps {
  currentPath: string;
  activePane: string;
  onSearchResults: (files: FileItem[]) => void;
  onSearchStateChange: (isActive: boolean) => void;
  onClearSearch: () => Promise<unknown>;
}

interface SearchResultPayload {
  request_id: string;
  items: Array<{
    name: string;
    path: string;
    size: number;
    modified: string | null;
    is_dir: boolean;
  }>;
}

interface SearchDonePayload {
  request_id: string;
  total: number;
  returned_count: number;
  is_truncated: boolean;
}

export function InputGroupDemo({
  currentPath,
  activePane,
  onSearchResults,
  onSearchStateChange,
  onClearSearch,
}: InputGroupDemoProps) {
  const [search, setSearch] = useState("");
  const [resultsLabel, setResultsLabel] = useState("0");
  const [isSearching, setIsSearching] = useState(false);
  const { searchThreads } = useSettings();

  // Refs para evitar re-crear listeners en cada búsqueda
  const activeRequestRef = useRef<string | null>(null);
  const streamedFilesRef = useRef<FileItem[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const unlistenResultRef = useRef<UnlistenFn | null>(null);
  const unlistenDoneRef = useRef<UnlistenFn | null>(null);
  const onSearchResultsRef = useRef(onSearchResults);
  const onSearchStateChangeRef = useRef(onSearchStateChange);
  const onClearSearchRef = useRef(onClearSearch);

  // Mantener refs actualizadas para callbacks
  onSearchResultsRef.current = onSearchResults;
  onSearchStateChangeRef.current = onSearchStateChange;
  onClearSearchRef.current = onClearSearch;

  // Suscribirse a eventos de Tauri UNA SOLA VEZ al montar
  useEffect(() => {
    const setupListeners = async () => {
      unlistenResultRef.current = await listen<SearchResultPayload>("search-results-chunk", (event) => {
        const requestId = activeRequestRef.current;
        if (!requestId || event.payload.request_id !== requestId) {
          return;
        }

        const mappedChunk: FileItem[] = event.payload.items.map((item) => ({
          name: item.name,
          path: item.path,
          size: item.size,
          modified: item.modified,
          isDirectory: item.is_dir,
        }));

        streamedFilesRef.current = mappedChunk;

        if (flushTimerRef.current === null) {
          flushTimerRef.current = window.setTimeout(() => {
            flushTimerRef.current = null;

            if (activeRequestRef.current !== requestId) {
              return;
            }

            setResultsLabel(String(streamedFilesRef.current.length));
            onSearchResultsRef.current([...streamedFilesRef.current]);
          }, RESULT_FLUSH_MS);
        }
      });

      unlistenDoneRef.current = await listen<SearchDonePayload>("search-done", (event) => {
        const requestId = activeRequestRef.current;
        if (!requestId || event.payload.request_id !== requestId) {
          return;
        }

        if (flushTimerRef.current !== null) {
          window.clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }

        onSearchResultsRef.current([...streamedFilesRef.current]);
        if (event.payload.is_truncated) {
          setResultsLabel(`${event.payload.returned_count} de ${event.payload.total}`);
        } else {
          setResultsLabel(String(event.payload.total));
        }
        setIsSearching(false);

        activeRequestRef.current = null;
        streamedFilesRef.current = [];
      });
    };

    void setupListeners();

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
      unlistenResultRef.current?.();
      unlistenDoneRef.current?.();
    };
  }, []);

  const resetSearchUi = useCallback(() => {
    setIsSearching(false);
    setResultsLabel("0");
    onSearchStateChangeRef.current(false);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      activeRequestRef.current = null;
      streamedFilesRef.current = [];
      resetSearchUi();
      await onClearSearchRef.current();
      return;
    }

    // Cancelar búsqueda anterior
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    activeRequestRef.current = requestId;
    streamedFilesRef.current = [];

    setIsSearching(true);
    setResultsLabel("0");
    onSearchStateChangeRef.current(true);
    onSearchResultsRef.current([]);

    try {
      await invoke("search_files_fuzzy", {
        query: searchQuery,
        path: currentPath,
        threads: searchThreads,
        requestId,
        limit: DEFAULT_SEARCH_LIMIT,
      });
    } catch (error) {
      console.error("Search failed:", error);
      activeRequestRef.current = null;
      streamedFilesRef.current = [];
      resetSearchUi();
      toast.error("Search failed");
    }
  }, [currentPath, resetSearchUi, searchThreads]);

  const performSearchRef = useRef(performSearch);
  performSearchRef.current = performSearch;

  const prevPathRef = useRef(currentPath);
  const prevActivePaneRef = useRef(activePane);

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!search.trim()) {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const hadActiveRequest = activeRequestRef.current !== null;
      activeRequestRef.current = null;
      streamedFilesRef.current = [];
      resetSearchUi();
      if (hadActiveRequest) {
        void invoke("cancel_search");
      }
      void onClearSearchRef.current();
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      void performSearchRef.current(search);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [search, currentPath, searchThreads, resetSearchUi]);

  useEffect(() => {
    const pathChanged = prevPathRef.current !== currentPath;
    const paneChanged = prevActivePaneRef.current !== activePane;

    prevPathRef.current = currentPath;
    prevActivePaneRef.current = activePane;

    // Only reset search when navigating within the same pane;
    // preserve search state when switching panes.
    if (!pathChanged || paneChanged) return;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearch("");
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (activeRequestRef.current !== null) {
      void invoke("cancel_search");
    }
    activeRequestRef.current = null;
    streamedFilesRef.current = [];
    resetSearchUi();
  }, [currentPath, activePane, resetSearchUi]);

  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        {isSearching ? <LoaderCircle className="animate-spin" /> : <Search />}
      </InputGroupAddon>
      <InputGroupInput
        placeholder="Buscar en esta carpeta..."
        className="font-sans text-sm font-medium placeholder:text-muted-foreground/70"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <InputGroupAddon align="inline-end" className="text-[11px] font-bold uppercase tracking-[0.12em]">
        {isSearching ? "..." : resultsLabel}
      </InputGroupAddon>
      {search && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              setSearch("");
            }}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
