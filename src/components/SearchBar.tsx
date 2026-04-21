import { Search } from "lucide-react"
import { invoke } from "@tauri-apps/api/core";
import { useState, KeyboardEvent } from "react";
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

export function InputGroupDemo({ currentPath, onSearchResults }: InputGroupDemoProps) {
  const [search, setSearch] = useState("");
  const [resultsCount, setResultsCount] = useState(0);
  const { searchThreads } = useSettings();

  async function performSearch(searchQuery: string) {
    if (!searchQuery.trim()) {
      // If empty string, trigger parent to perhaps reload the current folder naturally 
      // but let's just ignore for now, the user can use breadcrumbs to go back
      setResultsCount(0);
      return;
    }
    
    try {
      const results = await invoke<Array<{
        name: string;
        path: string;
        size: number;
        modified: string | null;
        is_dir: boolean;
      }>>("search_with_ignore", { pattern: searchQuery, path: currentPath, threads: searchThreads });
      
      const files: FileItem[] = results.map((item) => ({
        name: item.name,
        path: item.path,
        size: item.size,
        modified: item.modified,
        isDirectory: item.is_dir,
      }));
      
      setResultsCount(files.length);
      onSearchResults(files);
    } catch (error) {
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
