import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PreviewContent from "./PreviewContent";

vi.mock("@tauri-apps/api/core", async () => {
  const actual = await vi.importActual<typeof import("@tauri-apps/api/core")>(
    "@tauri-apps/api/core"
  );

  return {
    ...actual,
    convertFileSrc: (path: string) => `asset://${path}`,
  };
});

describe("PreviewContent", () => {
  it("routes text payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "text",
          content: "hello",
          truncated: false,
          sizeBytes: 5,
        }}
      />
    );

    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("routes markdown payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "markdown",
          content: "# Hello",
          truncated: false,
          sizeBytes: 7,
        }}
      />
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("routes image payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "image",
          dataUrl: "data:image/png;base64,AA==",
          mimeType: "image/png",
          sizeBytes: 2,
        }}
      />
    );

    expect(screen.getByAltText("Preview")).toBeInTheDocument();
  });

  it("routes pdf payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "pdf",
          path: "C:/sample.pdf",
          sizeBytes: 10,
        }}
      />
    );

    expect(screen.getByTitle("PDF preview")).toBeInTheDocument();
  });

  it("routes audio payloads", () => {
    const { container } = render(
      <PreviewContent
        payload={{
          type: "audio",
          path: "C:/sample.mp3",
          sizeBytes: 10,
        }}
      />
    );

    expect(container.querySelector("audio")).not.toBeNull();
  });

  it("routes video payloads", () => {
    const { container } = render(
      <PreviewContent
        payload={{
          type: "video",
          path: "C:/sample.mp4",
          sizeBytes: 10,
        }}
      />
    );

    expect(container.querySelector("video")).not.toBeNull();
  });

  it("routes directory payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "directory",
          entryCount: 4,
        }}
      />
    );

    expect(screen.getByText(/Directorio seleccionado/i)).toBeInTheDocument();
  });

  it("routes binary payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "binary",
          sizeBytes: 99,
          reason: "unsupported",
        }}
      />
    );

    expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
  });

  it("routes error payloads", () => {
    render(
      <PreviewContent payload={{ type: "error", message: "boom" }} />
    );

    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});
