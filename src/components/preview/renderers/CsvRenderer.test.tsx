import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CsvRenderer from "./CsvRenderer";

describe("CsvRenderer", () => {
  it("renders table with headers and rows", () => {
    render(
      <CsvRenderer
        payload={{
          type: "csv",
          headers: ["Name", "Age"],
          rows: [["Alice", "30"], ["Bob", "25"]],
          truncated: false,
          sizeBytes: 100,
        }}
      />
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("shows truncated badge when truncated", () => {
    render(
      <CsvRenderer
        payload={{
          type: "csv",
          headers: ["A"],
          rows: [["1"]],
          truncated: true,
          sizeBytes: 50,
        }}
      />
    );
    expect(screen.getByText(/Preview truncado/i)).toBeInTheDocument();
  });
});
