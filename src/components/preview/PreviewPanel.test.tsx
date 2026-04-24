import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PreviewPanel from "./PreviewPanel";

vi.mock("@tauri-apps/api/core", async () => {
  const actual = await vi.importActual<typeof import("@tauri-apps/api/core")>(
    "@tauri-apps/api/core"
  );

  return {
    ...actual,
    convertFileSrc: (path: string) => `asset://${path}`,
  };
});

describe("PreviewPanel", () => {
  it("provides a full-height content area for image previews", () => {
    render(
      <PreviewPanel
        open
        selectedName="photo.png"
        payload={{
          type: "image",
          path: "C:\\docs\\photo.png",
          mimeType: "image/png",
          sizeBytes: 12,
        }}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByTestId("preview-content-area")).toHaveClass("h-full");
    expect(screen.getByTestId("preview-content-area")).toHaveClass("scrollbar-hidden");
    expect(screen.getByAltText("Preview")).toHaveAttribute("src", "asset://C:/docs/photo.png");
  });

  it("resizes up to 60 percent of the viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1000,
    });

    render(
      <PreviewPanel
        open
        selectedName="photo.png"
        payload={null}
        isLoading={false}
        error={null}
      />
    );

    const handle = screen.getByRole("separator", { name: "Resize preview panel" });
    const panel = handle.closest("aside");

    for (let i = 0; i < 20; i += 1) {
      fireEvent.keyDown(handle, { key: "ArrowLeft" });
    }

    expect(panel).toHaveStyle({ width: "600px", maxWidth: "60vw" });
  });
});
