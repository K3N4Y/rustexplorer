import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagChips } from "./tag-chips";

const tags = [
  { id: "t1", name: "rust", color: "#dea584" },
  { id: "t2", name: "typescript", color: "#3178c6" },
  { id: "t3", name: "go", color: "#00add8" },
  { id: "t4", name: "python", color: "#3776ab" },
  { id: "t5", name: "java", color: "#b07219" },
];

describe("TagChips", () => {
  it("renders the tags", () => {
    render(<TagChips tags={tags.slice(0, 3)} />);

    expect(screen.getByText("rust")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("go")).toBeInTheDocument();
  });

  it("shows +N overflow when there are more than 3 tags", () => {
    render(<TagChips tags={tags} />);

    expect(screen.getByText("rust")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("go")).toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("does not show overflow when tags are within max limit", () => {
    render(<TagChips tags={tags.slice(0, 2)} />);

    expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
  });

  it("shows tooltip with remaining tag names on overflow counter", () => {
    render(<TagChips tags={tags} />);

    const overflow = screen.getByText("+2");
    expect(overflow).toHaveAttribute("title", "python, java");
  });

  it("returns null when no tags are provided", () => {
    const { container } = render(<TagChips tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("respects custom max prop", () => {
    render(<TagChips tags={tags} max={2} />);

    expect(screen.getByText("rust")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByText("+3")).toHaveAttribute("title", "go, python, java");
  });
});
