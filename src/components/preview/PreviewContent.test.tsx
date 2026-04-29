import { render, screen, waitFor } from "@testing-library/react";
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

vi.mock("./renderers/MarkdownRenderer", () => ({
  default: ({ payload }: { payload: { content: string } }) => <div>{payload.content.replace("# ", "")}</div>,
}));

vi.mock("./renderers/CodeRenderer", () => ({
  default: ({ payload }: { payload: { language: string } }) => <div>{payload.language}</div>,
}));

vi.mock("./renderers/JsonRenderer", () => ({
  default: () => <div>JSON Object</div>,
}));

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
  it("routes text payloads", async () => {
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

    expect(await screen.findByText("hello")).toBeInTheDocument();
  });

  it("routes markdown payloads", async () => {
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

    expect(await screen.findByText("Hello")).toBeInTheDocument();
  });

  it("routes image payloads", async () => {
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

    expect(await screen.findByAltText("Preview")).toHaveAttribute("src", "asset://C:/docs/photo.png");
  });

  it("routes pdf payloads", async () => {
    render(
      <PreviewContent
        payload={{
          type: "pdf",
          path: "C:/sample.pdf",
          sizeBytes: 10,
        }}
      />
    );

    expect(await screen.findByLabelText("PDF preview")).toBeInTheDocument();
  });

  it("routes audio payloads", async () => {
    const { container } = render(
      <PreviewContent
        payload={{
          type: "audio",
          path: "C:/sample.mp3",
          sizeBytes: 10,
        }}
      />
    );

    await waitFor(() => {
      expect(container.querySelector("audio")).not.toBeNull();
    });
  });

  it("routes video payloads", async () => {
    const { container } = render(
      <PreviewContent
        payload={{
          type: "video",
          path: "C:/sample.mp4",
          sizeBytes: 10,
        }}
      />
    );

    await waitFor(() => {
      expect(container.querySelector("video")).not.toBeNull();
    });
  });

  it("routes directory payloads", async () => {
    render(
      <PreviewContent
        payload={{
          type: "directory",
          entryCount: 4,
        }}
      />
    );

    expect(await screen.findByText(/Directorio seleccionado/i)).toBeInTheDocument();
  });

  it("routes binary payloads", async () => {
    render(
      <PreviewContent
        payload={{
          type: "binary",
          sizeBytes: 99,
          reason: "unsupported",
        }}
      />
    );

    expect(await screen.findByText("Tamaño: 99 bytes")).toBeInTheDocument();
    expect(await screen.findByText(/unsupported/i)).toBeInTheDocument();
  });

  it("routes code payloads", async () => {
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
    expect(await screen.findByText("rust")).toBeInTheDocument();
  });

  it("routes csv payloads", async () => {
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
    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("routes json payloads", async () => {
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
    expect(await screen.findByText("JSON Object")).toBeInTheDocument();
  });
});
