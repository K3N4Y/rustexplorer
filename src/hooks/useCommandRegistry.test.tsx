import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCommandRegistry } from "./useCommandRegistry";

const mockRegisterCommand = vi.fn();
const mockUnregisterCommand = vi.fn();
const mockCommands = [
  {
    id: "test-cmd",
    label: "Test Command",
    keywords: ["test"],
    category: "Navigation",
    action: () => {},
  },
];

vi.mock("@/components/command-palette/CommandPaletteProvider", () => ({
  useCommandPaletteContext: () => ({
    registerCommand: mockRegisterCommand,
    unregisterCommand: mockUnregisterCommand,
    commands: mockCommands,
  }),
}));

describe("useCommandRegistry", () => {
  it("returns register, unregister, and commands from context", () => {
    const { result } = renderHook(() => useCommandRegistry());

    expect(result.current.register).toBe(mockRegisterCommand);
    expect(result.current.unregister).toBe(mockUnregisterCommand);
    expect(result.current.commands).toBe(mockCommands);
  });
});
