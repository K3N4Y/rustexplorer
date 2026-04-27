import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceProvider, useWorkspaceContext, type AppData } from "./workspace-provider";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

describe("WorkspaceProvider", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("loads app data on mount", async () => {
    const appData: AppData = {
      workspaces: [{ id: "ws1", name: "Workspace 1", color: "#ff0000", paths: [] }],
      tags: [{ id: "tag1", name: "Tag 1", color: "#00ff00" }],
      path_tags: {},
    };
    invokeMock.mockResolvedValue(appData);

    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.appData).toEqual(appData);
    });

    expect(result.current.isLoading).toBe(false);
    expect(invokeMock).toHaveBeenCalledWith("get_app_data");
  });

  it("createWorkspace calls Tauri command and updates state", async () => {
    const initialData: AppData = {
      workspaces: [],
      tags: [],
      path_tags: {},
    };
    const updatedData: AppData = {
      workspaces: [{ id: "ws1", name: "New Workspace", color: "#ff0000", paths: [] }],
      tags: [],
      path_tags: {},
    };

    invokeMock.mockResolvedValueOnce(initialData).mockResolvedValueOnce(updatedData);

    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.appData).toEqual(initialData);
    });

    let data: AppData | undefined;
    await act(async () => {
      data = await result.current.createWorkspace("New Workspace", "#ff0000");
    });

    expect(invokeMock).toHaveBeenCalledWith("create_workspace", { name: "New Workspace", color: "#ff0000" });
    expect(data).toEqual(updatedData);
    expect(result.current.appData).toEqual(updatedData);
  });

  it("createTag calls Tauri command and updates state", async () => {
    const initialData: AppData = {
      workspaces: [],
      tags: [],
      path_tags: {},
    };
    const updatedData: AppData = {
      workspaces: [],
      tags: [{ id: "tag1", name: "New Tag", color: "#00ff00" }],
      path_tags: {},
    };

    invokeMock.mockResolvedValueOnce(initialData).mockResolvedValueOnce(updatedData);

    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.appData).toEqual(initialData);
    });

    let data: AppData | undefined;
    await act(async () => {
      data = await result.current.createTag("New Tag", "#00ff00");
    });

    expect(invokeMock).toHaveBeenCalledWith("create_tag", { name: "New Tag", color: "#00ff00" });
    expect(data).toEqual(updatedData);
    expect(result.current.appData).toEqual(updatedData);
  });

  it("handles get_app_data failure gracefully", async () => {
    invokeMock.mockRejectedValue(new Error("Failed to load"));

    const { result } = renderHook(() => useWorkspaceContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.appData).toBeNull();
  });
});
