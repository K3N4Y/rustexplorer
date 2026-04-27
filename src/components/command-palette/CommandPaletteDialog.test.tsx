import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPaletteProvider } from "./CommandPaletteProvider";
import { CommandPaletteDialog } from "./CommandPaletteDialog";

describe("CommandPaletteDialog", () => {
  beforeEach(() => {
    render(
      <CommandPaletteProvider>
        <CommandPaletteDialog />
      </CommandPaletteProvider>
    );
  });

  it("opens with Ctrl+P", async () => {
    await userEvent.keyboard("{Control>}p{/Control}");
    expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
  });

  it("opens with Ctrl+K", async () => {
    await userEvent.keyboard("{Control>}k{/Control}");
    expect(screen.getByPlaceholderText("Type a command or search...")).toBeInTheDocument();
  });

  it("closes with Escape", async () => {
    await userEvent.keyboard("{Control>}p{/Control}");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Type a command or search...")).not.toBeInTheDocument();
    });
  });
});
