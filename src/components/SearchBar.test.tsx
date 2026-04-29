import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InputGroupDemo } from "./SearchBar";

const invokeMock = vi.fn();
const listenMock = vi.fn();
const listeners = new Map<string, (event: { payload: any }) => void>();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (eventName: string, handler: (event: { payload: any }) => void) => {
    listeners.set(eventName, handler);
    listenMock(eventName, handler);
    return Promise.resolve(() => listeners.delete(eventName));
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock("../lib/settings-provider", () => ({
  useSettings: () => ({
    searchThreads: 4,
  }),
}));

function renderSearchBar() {
  const onSearchResults = vi.fn();
  const onSearchStateChange = vi.fn();
  const onClearSearch = vi.fn().mockResolvedValue(undefined);

  render(
    <InputGroupDemo
      currentPath="C:/project"
      onSearchResults={onSearchResults}
      onSearchStateChange={onSearchStateChange}
      onClearSearch={onClearSearch}
    />,
  );

  return { onSearchResults, onSearchStateChange, onClearSearch };
}

describe("InputGroupDemo fuzzy search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invokeMock.mockResolvedValue(undefined);
    listeners.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes search_files_fuzzy with query, path, threads, requestId, and limit", async () => {
    renderSearchBar();

    const input = screen.getByPlaceholderText("Buscar en esta carpeta...");
    fireEvent.change(input, { target: { value: "appcs" } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(invokeMock).toHaveBeenCalledWith(
      "search_files_fuzzy",
      expect.objectContaining({
        query: "appcs",
        path: "C:/project",
        threads: 4,
        limit: 200,
        requestId: expect.any(String),
      }),
    );
  });

  it("replaces results on ranked snapshots instead of appending duplicates", async () => {
    const { onSearchResults } = renderSearchBar();

    const input = screen.getByPlaceholderText("Buscar en esta carpeta...");
    fireEvent.change(input, { target: { value: "appcs" } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    const activeRequestId = invokeMock.mock.calls[0][1].requestId;
    listeners.get("search-results-chunk")?.({
      payload: {
        request_id: activeRequestId,
        items: [{ name: "App.css", path: "C:/project/src/App.css", size: 2, modified: null, is_dir: false }],
      },
    });
    listeners.get("search-results-chunk")?.({
      payload: {
        request_id: activeRequestId,
        items: [
          { name: "App.css", path: "C:/project/src/App.css", size: 2, modified: null, is_dir: false },
          { name: "App.tsx", path: "C:/project/src/App.tsx", size: 3, modified: null, is_dir: false },
        ],
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(80);
    });

    expect(onSearchResults).toHaveBeenLastCalledWith([
      { name: "App.css", path: "C:/project/src/App.css", size: 2, modified: null, isDirectory: false },
      { name: "App.tsx", path: "C:/project/src/App.tsx", size: 3, modified: null, isDirectory: false },
    ]);
  });

  it("ignores stale result snapshots from old request ids", async () => {
    const { onSearchResults } = renderSearchBar();

    const input = screen.getByPlaceholderText("Buscar en esta carpeta...");
    fireEvent.change(input, { target: { value: "appcs" } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    onSearchResults.mockClear();
    listeners.get("search-results-chunk")?.({
      payload: {
        request_id: "old-request",
        items: [{ name: "Old.txt", path: "C:/project/Old.txt", size: 1, modified: null, is_dir: false }],
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(80);
    });

    expect(onSearchResults).not.toHaveBeenCalled();
  });

  it("clears search state, cancels backend search, and reloads the folder when input is cleared", async () => {
    const { onClearSearch, onSearchStateChange } = renderSearchBar();
    const input = screen.getByPlaceholderText("Buscar en esta carpeta...");

    fireEvent.change(input, { target: { value: "appcs" } });
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(onSearchStateChange).toHaveBeenLastCalledWith(false);
    expect(onClearSearch).toHaveBeenCalled();
    expect(invokeMock).toHaveBeenCalledWith("cancel_search");
  });

  it("debounces typing so immediate keypresses do not invoke search", async () => {
    renderSearchBar();
    invokeMock.mockClear();

    const input = screen.getByPlaceholderText("Buscar en esta carpeta...");
    fireEvent.change(input, { target: { value: "app" } });
    await act(async () => {
      vi.advanceTimersByTime(99);
    });

    expect(invokeMock).not.toHaveBeenCalledWith(
      "search_files_fuzzy",
      expect.any(Object),
    );
  });
});
