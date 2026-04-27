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

describe("PreviewPanel", () => {
  it("provides a full-height content area for image previews", async () => {
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

  it("keeps the shell mounted while closing, then unmounts after the width transition", () => {
    const { container, rerender } = render(
      <PreviewPanel
        open
        selectedName="photo.png"
        payload={null}
        isLoading={false}
        error={null}
      />
    );

    const panel = container.querySelector("aside");
    expect(panel).toBeInTheDocument();

    rerender(
      <PreviewPanel
        open={false}
        selectedName="photo.png"
        payload={null}
        isLoading={false}
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
        selectedName="photo.png"
        payload={null}
        isLoading={false}
        error={null}
      />
    );

    expect(container.querySelector("aside")).not.toBeInTheDocument();

    rerender(
      <PreviewPanel
        open
        selectedName="photo.png"
        payload={null}
        isLoading={false}
        error={null}
      />
    );

    const panel = container.querySelector("aside");
    expect(panel).toHaveStyle({ width: "0px", minWidth: "0" });
    expect(screen.queryByText("[SELECT FILE] SPACE TO PREVIEW")).not.toBeInTheDocument();

    act(() => {
      frames.shift()?.(0);
    });

    expect(panel).toHaveStyle({ width: "0px", minWidth: "0" });

    act(() => {
      frames.shift()?.(0);
    });

    expect(panel).toHaveStyle({ width: "420px", minWidth: "0" });
    expect(screen.queryByText("[SELECT FILE] SPACE TO PREVIEW")).not.toBeInTheDocument();

    fireEvent.transitionEnd(panel as HTMLElement, { propertyName: "width" });

    expect(screen.getByText("[SELECT FILE] SPACE TO PREVIEW")).toBeInTheDocument();

    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });
});
