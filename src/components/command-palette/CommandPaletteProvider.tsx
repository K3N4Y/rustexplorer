import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Command } from "@/types/command";

interface CommandPaletteContextValue {
  commands: Command[];
  registerCommand: (command: Command) => void;
  unregisterCommand: (id: string) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [commandMap, setCommandMap] = useState<Map<string, Command>>(new Map());

  const registerCommand = useCallback((command: Command) => {
    setCommandMap((prev) => {
      const next = new Map(prev);
      next.set(command.id, command);
      return next;
    });
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    setCommandMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const commands = useMemo(() => Array.from(commandMap.values()), [commandMap]);

  const value = useMemo(
    () => ({ commands, registerCommand, unregisterCommand }),
    [commands, registerCommand, unregisterCommand]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPaletteContext() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPaletteContext must be used within CommandPaletteProvider");
  }
  return context;
}
