import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import * as pdfjsLib from "pdfjs-dist";
import { convertFileSrc } from "@tauri-apps/api/core";
import PdfRenderer from "./PdfRenderer";

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openPath: vi.fn(),
}));

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(
    () =>
      ({
        canvas: document.createElement("canvas"),
      }) as unknown as CanvasRenderingContext2D
  ),
});

describe("PdfRenderer", () => {
  it("loads PDFs through pdfjs using a converted asset URL", async () => {
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({
      promise: Promise.resolve({
        getPage: vi.fn(() =>
          Promise.resolve({
            getViewport: vi.fn(() => ({ width: 320, height: 480 })),
            render: vi.fn(() => ({ promise: Promise.resolve() })),
          })
        ),
        destroy: vi.fn(() => Promise.resolve()),
      }),
      destroy: vi.fn(),
    } as never);

    render(<PdfRenderer payload={{ type: "pdf", path: "C:\\docs\\report.pdf", sizeBytes: 1024 }} />);

    await waitFor(() => {
      expect(pdfjsLib.getDocument).toHaveBeenCalledWith("asset://C:/docs/report.pdf");
    });
    expect(convertFileSrc).toHaveBeenCalledWith("C:/docs/report.pdf");
    expect(screen.getByTestId("pdf-viewport")).toHaveClass("scrollbar-hidden");
  });
});
