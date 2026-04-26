import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JsonRenderer from "./JsonRenderer";
import SyntaxHighlighter from "react-syntax-highlighter";
import { github, atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";

vi.mock("react-syntax-highlighter", () => ({
  default: vi.fn(({ children }: { children: React.ReactNode }) => <pre>{children}</pre>),
}));

vi.mock("../../theme-provider", () => ({
  useTheme: vi.fn(() => ({ theme: "system", setTheme: vi.fn() })),
}));

import { useTheme } from "../../theme-provider";

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

describe("JsonRenderer", () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({ theme: "system", setTheme: vi.fn() });
    vi.mocked(SyntaxHighlighter).mockClear();
  });

  it("renders json content", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: vi.fn() });
    render(
      <JsonRenderer
        payload={{
          type: "json",
          content: '{"name": "Alice"}',
          isArray: false,
          truncated: false,
          sizeBytes: 100,
        }}
      />
    );
    expect(screen.getByText(/"name"/)).toBeInTheDocument();
  });

  it("shows JSON Object badge", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: vi.fn() });
    render(
      <JsonRenderer
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

  it("shows JSON Array badge", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: vi.fn() });
    render(
      <JsonRenderer
        payload={{
          type: "json",
          content: "[]",
          isArray: true,
          truncated: false,
          sizeBytes: 10,
        }}
      />
    );
    expect(screen.getByText("JSON Array")).toBeInTheDocument();
  });

  it("shows truncated badge when truncated", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: vi.fn() });
    render(
      <JsonRenderer
        payload={{
          type: "json",
          content: "[]",
          isArray: true,
          truncated: true,
          sizeBytes: 1024,
        }}
      />
    );
    expect(screen.getByText(/Preview truncado/i)).toBeInTheDocument();
  });

  it("uses atomOneDark theme in dark mode", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "dark", setTheme: vi.fn() });
    render(
      <JsonRenderer
        payload={{
          type: "json",
          content: "{}",
          isArray: false,
          truncated: false,
          sizeBytes: 10,
        }}
      />
    );
    expect(vi.mocked(SyntaxHighlighter)).toHaveBeenCalled();
    const lastCall = vi.mocked(SyntaxHighlighter).mock.calls[vi.mocked(SyntaxHighlighter).mock.calls.length - 1];
    expect(lastCall[0].style).toBe(atomOneDark);
  });

  it("uses github theme in light mode", () => {
    vi.mocked(useTheme).mockReturnValue({ theme: "light", setTheme: vi.fn() });
    render(
      <JsonRenderer
        payload={{
          type: "json",
          content: "{}",
          isArray: false,
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
