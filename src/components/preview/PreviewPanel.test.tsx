import { act, fireEvent, render, screen } from "@testing-library/react";
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

const mockFileItem = {
  name: "photo.png",
  path: "C:\\docs\\photo.png",
  size: 1234,
  modified: "2024-01-15T10:30:00Z",
  isDirectory: false,
};

describe("PreviewPanel", () => {
  it("provides a full-height content area for image previews", async () => {
    render(
      <PreviewPanel
        open
        selectedItem={mockFileItem}
        payload={{
          type: "image",
          path: "C:\\docs\\photo.png",
          mimeType: "image/png",
          sizeBytes: 12,
        }}
        error={null}
      />
    );

    expect(screen.getByTestId("preview-content-area")).toHaveClass("h-full");
    expect(screen.getByTestId("preview-content-area")).toHaveClass("scrollbar-hidden");
    expect(await screen.findByAltText("Preview")).toHaveAttribute("src", "asset://C:/docs/photo.png");
  });

  it("resizes up to 60 percent of the viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1000,
    });

    render(
      <PreviewPanel
        open
        selectedItem={mockFileItem}
        payload={null}
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

  it("keeps the shell mounted while closing, then unmounts after the width transition", () => {
    const { container, rerender } = render(
      <PreviewPanel
        open
        selectedItem={mockFileItem}
        payload={null}
        error={null}
      />
    );

    const panel = container.querySelector("aside");
    expect(panel).toBeInTheDocument();

    rerender(
      <PreviewPanel
        open={false}
        selectedItem={mockFileItem}
        payload={null}
        error={null}
      />
    );

    expect(container.querySelector("aside")).toBeInTheDocument();
    expect(panel).toHaveStyle({ width: "0px", minWidth: "0" });

    fireEvent.transitionEnd(panel as HTMLElement, { propertyName: "width" });

    expect(container.querySelector("aside")).not.toBeInTheDocument();
  });

  it("mounts collapsed first so opening can animate without a layout jump", () => {
    const frames: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
    const cancelAnimationFrameSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});

    const { container, rerender } = render(
      <PreviewPanel
        open={false}
        selectedItem={null}
        payload={null}
        error={null}
      />
    );

    expect(container.querySelector("aside")).not.toBeInTheDocument();

    rerender(
      <PreviewPanel
        open
        selectedItem={null}
        payload={null}
        error={null}
      />
    );

    const panel = container.querySelector("aside");
    expect(panel).toHaveStyle({ width: "0px", minWidth: "0" });
    expect(screen.getByText("[SELECT FILE] SPACE TO PREVIEW")).toBeInTheDocument();

    act(() => {
      frames.shift()?.(0);
    });

    expect(panel).toHaveStyle({ width: "0px", minWidth: "0" });

    act(() => {
      frames.shift()?.(0);
    });

    expect(panel).toHaveStyle({ width: "420px", minWidth: "0" });
    expect(screen.getByText("[SELECT FILE] SPACE TO PREVIEW")).toBeInTheDocument();

    fireEvent.transitionEnd(panel as HTMLElement, { propertyName: "width" });

    expect(screen.getByText("[SELECT FILE] SPACE TO PREVIEW")).toBeInTheDocument();

    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it("shows file metadata in the header immediately", () => {
    render(
      <PreviewPanel
        open
        selectedItem={mockFileItem}
        payload={null}
        error={null}
      />
    );

    expect(screen.getByText("photo.png")).toBeInTheDocument();
    expect(screen.getByText(/1.2 KB/)).toBeInTheDocument();
    expect(screen.getByText(/PNG Image/)).toBeInTheDocument();
  });

  it("shows a skeleton when loading without payload", () => {
    render(
      <PreviewPanel
        open
        selectedItem={{ ...mockFileItem, name: "report.pdf" }}
        payload={null}
        error={null}
      />
    );

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    // Skeleton should be in the document for PDFs
    const skeleton = document.querySelector(".animate-pulse");
    expect(skeleton).toBeInTheDocument();
  });

  it("renders content immediately when payload is available", () => {
    render(
      <PreviewPanel
        open
        selectedItem={mockFileItem}
        payload={{
          type: "text",
          content: "hello world",
          truncated: false,
          sizeBytes: 11,
        }}
        error={null}
      />
    );

    expect(screen.getByText("hello world")).toBeInTheDocument();
  });
});
