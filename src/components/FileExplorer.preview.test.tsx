import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FileExplorer from "./FileExplorer";

describe("FileExplorer preview toggle", () => {
  it("calls preview toggle when Space is pressed and a file is selected", () => {
    const onTogglePreview = vi.fn();

    render(
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
    );

    fireEvent.keyDown(window, { key: " " });

    expect(onTogglePreview).toHaveBeenCalledTimes(1);
  });
});
