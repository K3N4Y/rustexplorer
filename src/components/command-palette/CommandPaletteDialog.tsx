import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandPaletteContext } from "./CommandPaletteProvider";
import type { Command as CommandType } from "@/types/command";
import {
  ArrowUp,
  Columns,
  Command as CommandIcon,
  GitBranch,
  LayoutGrid,
  PanelRight,
  Search,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  ArrowUp,
  Columns,
  Command: CommandIcon,
  GitBranch,
  LayoutGrid,
  PanelRight,
  Search,
  Settings,
};

function getIcon(iconName: string) {
  const Icon = ICON_MAP[iconName];
  if (!Icon) {
    return CommandIcon;
  }
  return Icon;
}

function fuzzyScore(query: string, text: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  if (lowerText.startsWith(lowerQuery)) return 3;
  if (lowerText.includes(lowerQuery)) return 2;
  // Check if all characters appear in order
  let qi = 0;
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) qi++;
  }
  if (qi === lowerQuery.length) return 1;
  return 0;
}

export function CommandPaletteDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { commands } = useCommandPaletteContext();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "k")) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const scored = commands
      .map((cmd) => {
        const labelScore = fuzzyScore(search, cmd.label);
        const keywordScore = Math.max(
          ...cmd.keywords.map((kw) => fuzzyScore(search, kw)),
          0
        );
        const descScore = cmd.description ? fuzzyScore(search, cmd.description) : 0;
        const score = Math.max(labelScore, keywordScore, descScore);
        return { cmd, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((item) => item.cmd);
  }, [commands, search]);

  const groupedCommands = useMemo(() => {
    const groups = new Map<string, CommandType[]>();
    for (const cmd of filteredCommands) {
      const cat = cmd.category || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const handleSelect = useCallback(
    async (cmd: CommandType) => {
      if (cmd.isEnabled && !cmd.isEnabled()) return;
      setOpen(false);
      setSearch("");
      try {
        const result = cmd.action();
        if (result && typeof result.then === "function") {
          await result;
        }
      } catch (err) {
        toast.error("Command failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    []
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput
          placeholder="Type a command or search..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {commands.length === 0
              ? "No commands available."
              : `No commands found for "${search}".`}
          </CommandEmpty>
          {Array.from(groupedCommands.entries()).map(([category, cmds]) => (
            <CommandGroup key={category} heading={category}>
              {cmds.map((cmd) => {
                const Icon = cmd.icon ? getIcon(cmd.icon) : null;
                const isDisabled = cmd.isEnabled ? !cmd.isEnabled() : false;
                return (
                  <CommandItem
                    key={cmd.id}
                    onSelect={() => handleSelect(cmd)}
                    value={cmd.id}
                    disabled={isDisabled}
                    data-disabled={isDisabled}
                    className="data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.description && (
                      <span className="text-muted-foreground mr-2 text-xs">
                        {cmd.description}
                      </span>
                    )}
                    {cmd.shortcut && (
                      <CommandShortcut>{cmd.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
