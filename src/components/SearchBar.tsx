import { Search } from "lucide-react"
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

export function InputGroupDemo() {
  const [search, setSearch] = useState("");
  const [resultsCount, setResultsCount] = useState(0);

  async function getFile(search: string) {
    const files = await invoke<unknown[]>("search_with_ignore", { pattern: search });
    setResultsCount(files.length);
  }

  return (
    <InputGroup className="max-w-xs">
      <InputGroupInput
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void getFile(search);
          }
        }}
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">{resultsCount} results</InputGroupAddon>
    </InputGroup>
  )
}
