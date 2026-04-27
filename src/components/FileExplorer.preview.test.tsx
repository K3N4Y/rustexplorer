import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FileExplorer from "./FileExplorer";
import { WorkspaceProvider } from "@/lib/workspace-provider";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({ workspaces: [], tags: [], path_tags: {} }),
}));

describe("FileExplorer preview toggle", () => {
  it("calls preview toggle when Space is pressed and a file is selected", () => {
    const onTogglePreview = vi.fn();

    render(
      <WorkspaceProvider>
        <FileExplorer
          initialFiles={[
            {
              name: "notes.txt",
              path: "C:/notes.txt",
              size: 10,
              modified: null,
              isDirectory: false,
            },
          ]}
          onLoadFolder={vi.fn().mockResolvedValue([])}
          onTogglePreview={onTogglePreview}
          onSelectionChange={vi.fn()}
        />
      </WorkspaceProvider>
    );

    fireEvent.keyDown(window, { key: " " });

    expect(onTogglePreview).toHaveBeenCalledTimes(1);
  });

  it("does not change the selected file when opening a context menu", async () => {
    const onSelectionChange = vi.fn();
    const files = [
      {
        name: "notes.txt",
        path: "C:/notes.txt",
        size: 10,
        modified: null,
        isDirectory: false,
      },
      {
        name: "photo.png",
        path: "C:/photo.png",
        size: 20,
        modified: null,
        isDirectory: false,
      },
    ];

    render(
      <WorkspaceProvider>
        <FileExplorer
          initialFiles={files}
          onLoadFolder={vi.fn().mockResolvedValue([])}
          onTogglePreview={vi.fn()}
          onSelectionChange={onSelectionChange}
        />
      </WorkspaceProvider>
    );

    await waitFor(() => {
      expect(onSelectionChange).toHaveBeenCalledWith(files[0]);
    });
    onSelectionChange.mockClear();

    fireEvent.contextMenu(screen.getByText("photo.png"));

    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
