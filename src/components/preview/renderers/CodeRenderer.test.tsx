import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import CodeRenderer from "./CodeRenderer";

vi.mock("react-syntax-highlighter", () => ({
  default: ({ children }: { children: React.ReactNode }) => <pre>{children}</pre>,
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
  it("renders code content", () => {
    render(
      <CodeRenderer
        content="fn main() {}"
        language="rust"
        truncated={false}
        sizeBytes={100}
      />
    );
    expect(screen.getByText("fn main() {}")).toBeInTheDocument();
  });

  it("shows language badge", () => {
    render(
      <CodeRenderer
        content="const x = 1;"
        language="typescript"
        truncated={false}
        sizeBytes={50}
      />
    );
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("shows truncated badge when truncated", () => {
    render(
      <CodeRenderer
        content="short"
        language="python"
        truncated={true}
        sizeBytes={1024}
      />
    );
    expect(screen.getByText(/truncated/i)).toBeInTheDocument();
  });
});
