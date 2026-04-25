import { LoaderCircle, Search, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { FileItem } from "./file-types";
import { useSettings } from "../lib/settings-provider";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

interface InputGroupDemoProps {
  currentPath: string;
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
}

export function InputGroupDemo({
  currentPath,
  onSearchResults,
  onSearchStateChange,
  onClearSearch,
}: InputGroupDemoProps) {
  const [search, setSearch] = useState("");
  const [resultsCount, setResultsCount] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const { searchThreads } = useSettings();
  const hadSearchRef = useRef(false);
  const activeRequestRef = useRef<string | null>(null);
  const unlistenResultRef = useRef<UnlistenFn | null>(null);
  const unlistenDoneRef = useRef<UnlistenFn | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
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

  const clearFlushTimer = () => {
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };

  const clearSearchListeners = () => {
    unlistenResultRef.current?.();
    unlistenDoneRef.current?.();
    unlistenResultRef.current = null;
    unlistenDoneRef.current = null;
  };

  const teardownActiveSearch = () => {
    clearFlushTimer();
    clearSearchListeners();
    activeRequestRef.current = null;
  };

  const resetSearchUi = () => {
    setIsSearching(false);
    setResultsCount(0);
    onSearchStateChange(false);
  };

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      teardownActiveSearch();
      resetSearchUi();
      await onClearSearch();
      return;
    }

    try {
      teardownActiveSearch();

      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      activeRequestRef.current = requestId;

      let streamedFiles: FileItem[] = [];
      setIsSearching(true);
      setResultsCount(0);
      onSearchStateChange(true);
      onSearchResults([]);

      unlistenResultRef.current = await listen<SearchResultPayload>("search-results-chunk", (event) => {
        if (event.payload.request_id !== requestId || activeRequestRef.current !== requestId) {
          return;
        }

        const mappedChunk: FileItem[] = event.payload.items.map((item) => ({
          name: item.name,
          path: item.path,
          size: item.size,
          modified: item.modified,
          isDirectory: item.is_dir,
        }));

        streamedFiles = streamedFiles.concat(mappedChunk);

        if (flushTimerRef.current === null) {
          flushTimerRef.current = window.setTimeout(() => {
            flushTimerRef.current = null;

            if (activeRequestRef.current !== requestId) {
              return;
            }

            setResultsCount(streamedFiles.length);
            onSearchResults([...streamedFiles]);
          }, 80);
        }
      });

      unlistenDoneRef.current = await listen<SearchDonePayload>("search-done", (event) => {
        if (event.payload.request_id !== requestId || activeRequestRef.current !== requestId) {
          return;
        }

        clearFlushTimer();
        onSearchResults([...streamedFiles]);
        setResultsCount(event.payload.total);
        setIsSearching(false);
        teardownActiveSearch();
      });

      await invoke("search_with_ignore", {
        pattern: searchQuery,
        path: currentPath,
        threads: searchThreads,
        requestId,
      });
    } catch (error) {
      teardownActiveSearch();
      resetSearchUi();
      console.error("Search failed:", error);
    }
  }

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    if (!search.trim()) {
      if (hadSearchRef.current) {
        teardownActiveSearch();
        hadSearchRef.current = false;
        resetSearchUi();
        void onClearSearch();
      }
      return;
    }

    hadSearchRef.current = true;
    debounceTimerRef.current = window.setTimeout(() => {
      void performSearch(search);
    }, 300);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [search, currentPath, searchThreads]);

  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSearch("");
    hadSearchRef.current = false;
    resetSearchUi();
    teardownActiveSearch();
  }, [currentPath, onSearchStateChange]);

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
        {isSearching ? "..." : `${resultsCount}`}
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
