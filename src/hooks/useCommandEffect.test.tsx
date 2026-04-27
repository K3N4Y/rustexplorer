import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCommandEffect } from "./useCommandEffect";

const mockRegisterCommand = vi.fn();
const mockUnregisterCommand = vi.fn();

vi.mock("@/components/command-palette/CommandPaletteProvider", () => ({
  useCommandPaletteContext: () => ({
    registerCommand: mockRegisterCommand,
    unregisterCommand: mockUnregisterCommand,
    commands: [],
  }),
}));

describe("useCommandEffect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const command = {
    id: "test-cmd",
    label: "Test Command",
    keywords: ["test"],
    category: "Navigation",
    action: () => {},
  };

  it("registers the command on mount", () => {
    renderHook(() => useCommandEffect(command));

    expect(mockRegisterCommand).toHaveBeenCalledTimes(1);
    expect(mockRegisterCommand).toHaveBeenCalledWith(command);
  });

  it("unregisters the command on unmount", () => {
    const { unmount } = renderHook(() => useCommandEffect(command));

    unmount();

    expect(mockUnregisterCommand).toHaveBeenCalledTimes(1);
    expect(mockUnregisterCommand).toHaveBeenCalledWith(command.id);
  });

  it("re-registers when the command changes", () => {
    const { rerender } = renderHook(
      ({ cmd }) => useCommandEffect(cmd),
      { initialProps: { cmd: command } }
    );

    expect(mockRegisterCommand).toHaveBeenCalledTimes(1);

    const nextCommand = { ...command, id: "updated-cmd", label: "Updated" };
    rerender({ cmd: nextCommand });

    expect(mockUnregisterCommand).toHaveBeenCalledTimes(1);
    expect(mockUnregisterCommand).toHaveBeenCalledWith(command.id);
    expect(mockRegisterCommand).toHaveBeenCalledTimes(2);
    expect(mockRegisterCommand).toHaveBeenLastCalledWith(nextCommand);
  });
});
