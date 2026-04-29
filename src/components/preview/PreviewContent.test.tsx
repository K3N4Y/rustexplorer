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

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
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
          path: "C:\\docs\\photo.png",
          mimeType: "image/png",
          sizeBytes: 2,
        }}
      />
    );

    expect(screen.getByAltText("Preview")).toHaveAttribute("src", "asset://C:/docs/photo.png");
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

    expect(screen.getByLabelText("PDF preview")).toBeInTheDocument();
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

    expect(screen.getByText("Tamaño: 99 bytes")).toBeInTheDocument();
    expect(screen.getByText(/unsupported/i)).toBeInTheDocument();
  });

  it("routes code payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "code",
          content: "fn main() {}",
          language: "rust",
          truncated: false,
          sizeBytes: 100,
        }}
      />
    );
    expect(screen.getByText("rust")).toBeInTheDocument();
  });

  it("routes csv payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "csv",
          headers: ["A", "B"],
          rows: [["1", "2"]],
          truncated: false,
          sizeBytes: 50,
        }}
      />
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("routes json payloads", () => {
    render(
      <PreviewContent
        payload={{
          type: "json",
          content: "{}",
          isArray: false,
          truncated: false,
          sizeBytes: 10,
        }}
      />
    );
    expect(screen.getByText("JSON Object")).toBeInTheDocument();
  });
});
