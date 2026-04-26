import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CodeRenderer from "./CodeRenderer";
import { useTheme } from "../../theme-provider";
import SyntaxHighlighter from "react-syntax-highlighter";
import { github, atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

vi.mock("react-syntax-highlighter", () => ({
  default: vi.fn(({ children, style }: { children: React.ReactNode; style?: object }) => (
    <pre data-style={style ? "present" : "absent"}>{children}</pre>
  )),
}));

vi.mock("../../theme-provider", () => ({
  useTheme: vi.fn(() => ({ theme: "system", setTheme: vi.fn() })),
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

describe("CodeRenderer", () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({ theme: "system", setTheme: vi.fn() });
    vi.mocked(SyntaxHighlighter).mockClear();
  });

  it("renders code content", () => {
    render(
      <CodeRenderer
        payload={{
          type: "code",
          content: "fn main() {}",
          language: "rust",
          truncated: false,
          sizeBytes: 100,
        }}
      />
    );
    expect(screen.getByText("fn main() {}")).toBeInTheDocument();
  });

  it("shows language badge", () => {
    render(
      <CodeRenderer
        payload={{
          type: "code",
          content: "const x = 1;",
          language: "typescript",
          truncated: false,
          sizeBytes: 50,
        }}
      />
    );
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("shows truncated badge when truncated", () => {
    render(
      <CodeRenderer
        payload={{
          type: "code",
          content: "short",
          language: "python",
          truncated: true,
          sizeBytes: 1024,
        }}
      />
    );
    expect(screen.getByText("Preview truncado")).toBeInTheDocument();
  });

  it("uses atomOneDark style in dark mode", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "dark", setTheme: vi.fn() });

    render(
      <CodeRenderer
        payload={{
          type: "code",
          content: "dark",
          language: "rust",
          truncated: false,
          sizeBytes: 10,
        }}
      />
    );
    expect(vi.mocked(SyntaxHighlighter)).toHaveBeenCalled();
    const lastCall = vi.mocked(SyntaxHighlighter).mock.calls[vi.mocked(SyntaxHighlighter).mock.calls.length - 1];
    expect(lastCall[0].style).toBe(atomOneDark);
  });

  it("uses github style in light mode", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: vi.fn() });

    render(
      <CodeRenderer
        payload={{
          type: "code",
          content: "light",
          language: "rust",
          truncated: false,
          sizeBytes: 10,
        }}
      />
    );
    expect(vi.mocked(SyntaxHighlighter)).toHaveBeenCalled();
    const lastCall = vi.mocked(SyntaxHighlighter).mock.calls[vi.mocked(SyntaxHighlighter).mock.calls.length - 1];
    expect(lastCall[0].style).toBe(github);
  });
});
