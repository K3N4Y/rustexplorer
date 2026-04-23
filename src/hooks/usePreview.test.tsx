import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePreview } from "./usePreview";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

describe("usePreview", () => {
  it("does not fetch while preview is closed", () => {
    renderHook(() =>
      usePreview({
        selectedItem: {
          name: "notes.txt",
          path: "C:/notes.txt",
          size: 12,
          modified: null,
          isDirectory: false,
        },
        previewOpen: false,
      })
    );

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("fetches when preview is open and a file is selected", async () => {
    invokeMock.mockResolvedValue({
      type: "text",
      content: "hello",
      truncated: false,
      sizeBytes: 5,
    });

    const { result } = renderHook(() =>
      usePreview({
        selectedItem: {
          name: "notes.txt",
          path: "C:/notes.txt",
          size: 12,
          modified: null,
          isDirectory: false,
        },
        previewOpen: true,
      })
    );

    await waitFor(() => {
      expect(result.current.payload?.type).toBe("text");
    });

    expect(invokeMock).toHaveBeenCalledWith("read_file_preview", {
      path: "C:/notes.txt",
      maxBytes: undefined,
    });
  });
});
