import { Search } from "lucide-react"
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useState, KeyboardEvent, useEffect, useRef } from "react";
import type { FileItem } from "./file-types";
import { useSettings } from "../lib/settings-provider";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

interface InputGroupDemoProps {
  currentPath: string;
  onSearchResults: (files: FileItem[]) => void;
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

export function InputGroupDemo({ currentPath, onSearchResults }: InputGroupDemoProps) {
  const [search, setSearch] = useState("");
  const [resultsCount, setResultsCount] = useState(0);
  const { searchThreads } = useSettings();
  const activeRequestRef = useRef<string | null>(null);
  const unlistenResultRef = useRef<UnlistenFn | null>(null);
  const unlistenDoneRef = useRef<UnlistenFn | null>(null);
  const flushTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
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

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      clearFlushTimer();
      clearSearchListeners();
      activeRequestRef.current = null;
      onSearchResults([]);
      setResultsCount(0);
      return;
    }
    
    try {
      clearFlushTimer();
      clearSearchListeners();

      const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      activeRequestRef.current = requestId;

      let streamedFiles: FileItem[] = [];
      setResultsCount(0);
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
        activeRequestRef.current = null;
        clearSearchListeners();
      });

      await invoke("search_with_ignore", {
        pattern: searchQuery,
        path: currentPath,
        threads: searchThreads,
        requestId,
      });
    } catch (error) {
      clearFlushTimer();
      activeRequestRef.current = null;
      clearSearchListeners();
      console.error("Search failed:", error);
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      void performSearch(search);
    }
  };

  return (
    <InputGroup className="max-w-xs">
      <InputGroupInput
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">{resultsCount > 0 ? `${resultsCount}` : '0'}</InputGroupAddon>
    </InputGroup>
  )
}
