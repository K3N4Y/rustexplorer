import { useCommandPaletteContext } from "@/components/command-palette/CommandPaletteProvider";

export function useCommandRegistry() {
  const { registerCommand, unregisterCommand, commands } = useCommandPaletteContext();

  return {
    register: registerCommand,
    unregister: unregisterCommand,
    commands,
  };
}
