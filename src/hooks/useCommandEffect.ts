import { useEffect, useRef } from "react";
import type { Command } from "@/types/command";
import { useCommandRegistry } from "./useCommandRegistry";

export function useCommandEffect(command: Command) {
  const { register, unregister } = useCommandRegistry();
  const commandRef = useRef(command);
  commandRef.current = command;

  useEffect(() => {
    const cmd = commandRef.current;
    register(cmd);
    return () => unregister(cmd.id);
  }, [register, unregister, command.id]);
}
