import { render, screen } from "@testing-library/react";
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
});
