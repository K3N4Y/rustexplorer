# Workspace Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Workspace Hub UX so workspaces are easy to create, open, inspect, and manage from a first-class organization surface.

**Architecture:** Keep the current persisted workspace/tag model and provider APIs. Refactor the sidebar into a compact workspace launcher, expand `WorkspaceView` into the management hub, and thread current-folder/selected-item/drop context through `App`, `FileTreeSidebar`, and `FilePane`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tailwind utility classes, lucide-react icons, existing workspace provider and Tauri command bridge.

---

## File Structure

- Modify `src/components/workspace-sidebar-section.tsx`: convert workspace rows from primary expand behavior to primary open behavior, add create button, counts, active state, secondary expander, and drop feedback.
- Modify `src/components/workspace-sidebar-section.test.tsx`: update expectations for launcher behavior, create button, counts, secondary expansion, active state, and drop handling.
- Modify `src/components/workspace-view.tsx`: turn the simple path list into the Workspace Hub with header metadata, visible actions, grouped paths, tags, empty state, and remove-path buttons.
- Modify `src/components/workspace-view.test.tsx`: add tests for hub metadata, grouping, visible actions, remove behavior, empty state, and tag filtering.
- Modify `src-tauri/src/lib.rs`: add a Tauri command to update a workspace color.
- Modify `src/lib/workspace-provider.tsx` and `src/hooks/use-workspaces.ts`: expose `changeWorkspaceColor(id, color)` to React.
- Modify `src/components/create-workspace-dialog.tsx`: allow create submissions to return the created workspace data through `onCreated`, so drop-created workspaces can receive the dropped path.
- Modify `src/components/create-workspace-dialog.test.tsx`: cover create mode callback behavior while preserving rename mode.
- Modify `src/components/FilePane.tsx`: pass current path, selected item, and workspace action callbacks into `WorkspaceView`.
- Modify `src/components/FileTreeSidebar.tsx`: pass active workspace id and create/drop callbacks into `WorkspaceSidebarSection`.
- Modify `src/App.tsx`: hold pending dropped path state, open create dialog from drops, add selected/current path to workspaces, confirm workspace deletion, manage workspace color changes, and pass active workspace ids to sidebar.

---

### Task 1: Sidebar Launcher Behavior

**Files:**
- Modify: `src/components/workspace-sidebar-section.tsx`
- Test: `src/components/workspace-sidebar-section.test.tsx`

- [ ] **Step 1: Write failing tests for launcher behavior**

Replace the current "expands a workspace and shows its paths when clicked" test with open-on-row and secondary-expand tests, and add create/count/active assertions:

```tsx
it("renders create affordance, item counts, and active workspace state", () => {
  render(<WorkspaceSidebarSection {...defaultProps} activeWorkspaceId="ws1" />);

  expect(screen.getByRole("button", { name: "Create workspace" })).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.getByText("0")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open workspace Project Alpha" })).toHaveAttribute("aria-current", "page");
});

it("opens a workspace when the workspace row is clicked", () => {
  render(<WorkspaceSidebarSection {...defaultProps} />);

  fireEvent.click(screen.getByRole("button", { name: "Open workspace Project Alpha" }));

  expect(defaultProps.onOpenWorkspace).toHaveBeenCalledWith(
    expect.objectContaining({ id: "ws1", name: "Project Alpha" })
  );
  expect(screen.queryByText("src")).not.toBeInTheDocument();
});

it("expands paths only from the secondary expander", () => {
  render(<WorkspaceSidebarSection {...defaultProps} />);

  fireEvent.click(screen.getByRole("button", { name: "Expand Project Alpha paths" }));

  expect(screen.getByText("src")).toBeInTheDocument();
  expect(screen.getByText("docs")).toBeInTheDocument();
});

it("calls onCreateWorkspace when the create button is clicked", () => {
  render(<WorkspaceSidebarSection {...defaultProps} />);

  fireEvent.click(screen.getByRole("button", { name: "Create workspace" }));

  expect(defaultProps.onCreateWorkspace).toHaveBeenCalledWith();
});

it("adds a dropped path to an existing workspace and shows drag-over state", () => {
  render(<WorkspaceSidebarSection {...defaultProps} />);

  const row = screen
    .getByRole("button", { name: "Open workspace Project Alpha" })
    .closest("[data-workspace-drop-target]");
  const dataTransfer = {
    getData: vi.fn().mockReturnValue("C:/dropped/path"),
    dropEffect: "none",
  } as unknown as DataTransfer;

  fireEvent.dragOver(row!, { dataTransfer });
  expect(row).toHaveAttribute("data-drag-over", "true");

  fireEvent.drop(row!, { dataTransfer });

  expect(mockAddToWorkspace).toHaveBeenCalledWith("ws1", "C:/dropped/path");
});
```

Update `defaultProps` and component props used in tests:

```tsx
const defaultProps = {
  activeWorkspaceId: null,
  onNavigate: vi.fn(),
  onOpenWorkspace: vi.fn(),
  onRenameWorkspace: vi.fn(),
  onCreateWorkspace: vi.fn(),
  onCreateWorkspaceFromPath: vi.fn(),
};
```

- [ ] **Step 2: Run sidebar tests to verify failure**

Run:

```powershell
npm.cmd test -- src/components/workspace-sidebar-section.test.tsx
```

Expected: FAIL because `activeWorkspaceId`, `onCreateWorkspaceFromPath`, create button labels, and secondary expander behavior do not exist yet.

- [ ] **Step 3: Implement sidebar launcher props and UI**

Update `WorkspaceSidebarSectionProps`:

```tsx
interface WorkspaceSidebarSectionProps {
  activeWorkspaceId?: string | null;
  onNavigate: (path: string) => void;
  onOpenWorkspace: (workspace: Workspace) => void;
  onRenameWorkspace: (workspace: Workspace) => void;
  onCreateWorkspace: () => void;
  onCreateWorkspaceFromPath?: (path: string) => void;
}
```

Update the component signature:

```tsx
export function WorkspaceSidebarSection({
  activeWorkspaceId = null,
  onNavigate,
  onOpenWorkspace,
  onRenameWorkspace,
  onCreateWorkspace,
  onCreateWorkspaceFromPath,
}: WorkspaceSidebarSectionProps) {
```

Change `handleDropOnZone` to preserve the dropped path:

```tsx
const handleDropOnZone = useCallback(
  (e: React.DragEvent) => {
    e.preventDefault();
    const path = e.dataTransfer.getData("text/plain");
    if (path && onCreateWorkspaceFromPath) {
      onCreateWorkspaceFromPath(path);
      return;
    }
    onCreateWorkspace();
  },
  [onCreateWorkspace, onCreateWorkspaceFromPath]
);
```

Add drag-over state for existing workspace rows:

```tsx
const [dragOverWorkspaceId, setDragOverWorkspaceId] = useState<string | null>(null);

const handleDragLeave = useCallback((workspaceId: string) => {
  setDragOverWorkspaceId((current) => (current === workspaceId ? null : current));
}, []);
```

Update `handleDropOnWorkspace` so it clears visual state after a drop:

```tsx
const handleDropOnWorkspace = useCallback(
  (e: React.DragEvent, workspaceId: string) => {
    e.preventDefault();
    const path = e.dataTransfer.getData("text/plain");
    if (path) {
      void addToWorkspace(workspaceId, path);
    }
    setDragOverWorkspaceId(null);
  },
  [addToWorkspace]
);
```

Replace the header markup in both empty and non-empty states with a visible create button:

```tsx
<div className="mb-2 flex items-center justify-between gap-2">
  <div className="flex min-w-0 items-center gap-2">
    <Briefcase className="h-4 w-4 text-foreground" />
    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
      Workspaces
    </span>
  </div>
  <button
    type="button"
    onClick={onCreateWorkspace}
    aria-label="Create workspace"
    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
  >
    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
  </button>
</div>
```

Import `Plus`:

```tsx
import { ChevronDown, ChevronRight, Briefcase, Plus } from "lucide-react";
```

Update workspace rows so the main row opens and the expander is secondary:

```tsx
const isActive = activeWorkspaceId === workspace.id;
const isDragOver = dragOverWorkspaceId === workspace.id;

<div className="flex items-center gap-1">
  <button
    type="button"
    onClick={() => toggleExpand(workspace.id)}
    className="inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${workspace.name} paths`}
    aria-expanded={isExpanded}
  >
    {isExpanded ? (
      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
    ) : (
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
    )}
  </button>
  <button
    type="button"
    onClick={() => onOpenWorkspace(workspace)}
    aria-label={`Open workspace ${workspace.name}`}
    aria-current={isActive ? "page" : undefined}
    className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-200 ${
      isDragOver || isActive
        ? "border-l-2 border-l-accent bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}
  >
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{
        backgroundColor: workspace.color ?? "transparent",
        border: workspace.color ? "none" : "1.5px solid currentColor",
      }}
    />
    <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
    <span className="rounded-full border border-border-visible px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
      {workspace.paths.length}
    </span>
  </button>
</div>
```

Keep the row wrapper as the drop target:

```tsx
<div
  onDragOver={handleDragOver}
  onDragEnter={() => setDragOverWorkspaceId(workspace.id)}
  onDragLeave={() => handleDragLeave(workspace.id)}
  onDrop={(e) => void handleDropOnWorkspace(e, workspace.id)}
  data-workspace-drop-target
  data-drag-over={isDragOver ? "true" : "false"}
  className="select-none"
>
  {/* expander and open button */}
</div>
```

- [ ] **Step 4: Run sidebar tests to verify pass**

Run:

```powershell
npm.cmd test -- src/components/workspace-sidebar-section.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit sidebar launcher**

```powershell
git add src/components/workspace-sidebar-section.tsx src/components/workspace-sidebar-section.test.tsx
git commit -m "feat: make workspaces a sidebar launcher"
```

---

### Task 2: Workspace Hub View

**Files:**
- Modify: `src/components/workspace-view.tsx`
- Test: `src/components/workspace-view.test.tsx`

- [ ] **Step 1: Write failing tests for hub metadata, actions, grouping, and remove**

Add mutable mocks:

```tsx
const mockRemoveFromWorkspace = vi.fn();
const mockAddToWorkspace = vi.fn();
const mockDeleteWorkspace = vi.fn();
const mockRenameWorkspace = vi.fn();
```

Return them from the `useWorkspaces` mock:

```tsx
removeFromWorkspace: mockRemoveFromWorkspace,
addToWorkspace: mockAddToWorkspace,
deleteWorkspace: mockDeleteWorkspace,
renameWorkspace: mockRenameWorkspace,
```

Add tests:

```tsx
it("renders workspace hub metadata and visible actions", () => {
  render(
    <WorkspaceView
      {...defaultProps}
      currentPath="C:/projects/alpha"
      selectedItemPath="C:/projects/alpha/main.rs"
      onRenameWorkspace={vi.fn()}
      onDeleteWorkspace={vi.fn()}
      onChangeWorkspaceColor={vi.fn()}
    />
  );

  expect(screen.getByText("2 paths")).toBeInTheDocument();
  expect(screen.getByText("2 tags")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add current folder" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add selected item" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Rename workspace" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Delete workspace" })).toBeInTheDocument();
});

it("groups paths by parent folder", () => {
  render(<WorkspaceView {...defaultProps} />);

  expect(screen.getByText("alpha")).toBeInTheDocument();
  expect(screen.getByText("main.rs")).toBeInTheDocument();
  expect(screen.getByText("lib.rs")).toBeInTheDocument();
});

it("removes a path from the workspace", () => {
  render(<WorkspaceView {...defaultProps} />);

  fireEvent.click(screen.getByRole("button", { name: "Remove main.rs from workspace" }));

  expect(mockRemoveFromWorkspace).toHaveBeenCalledWith("ws1", "C:/projects/alpha/main.rs");
});

it("adds the current folder and selected item from visible actions", () => {
  render(
    <WorkspaceView
      {...defaultProps}
      currentPath="C:/projects/alpha"
      selectedItemPath="C:/projects/alpha/main.rs"
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Add current folder" }));
  fireEvent.click(screen.getByRole("button", { name: "Add selected item" }));

  expect(mockAddToWorkspace).toHaveBeenCalledWith("ws1", "C:/projects/alpha");
  expect(mockAddToWorkspace).toHaveBeenCalledWith("ws1", "C:/projects/alpha/main.rs");
});

it("shows a recovery action when the workspace is missing", () => {
  const onBackToFiles = vi.fn();

  render(
    <WorkspaceView
      {...defaultProps}
      workspaceId="nonexistent"
      currentPath="C:/projects/alpha"
      onBackToFiles={onBackToFiles}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Back to current folder" }));

  expect(onBackToFiles).toHaveBeenCalledWith("C:/projects/alpha");
});
```

- [ ] **Step 2: Run hub tests to verify failure**

Run:

```powershell
npm.cmd test -- src/components/workspace-view.test.tsx
```

Expected: FAIL because `WorkspaceView` does not yet accept the new props or render hub controls.

- [ ] **Step 3: Add hub props and helper functions**

Update `WorkspaceViewProps`:

```tsx
interface WorkspaceViewProps {
  workspaceId: string;
  currentPath?: string;
  selectedItemPath?: string | null;
  onNavigate: (path: string) => void;
  onTagClick?: (tagId: string) => void;
  onRenameWorkspace?: () => void;
  onDeleteWorkspace?: () => void;
  onChangeWorkspaceColor?: () => void;
  onBackToFiles?: (path: string) => void;
}
```

Update imports:

```tsx
import { useMemo, useCallback } from "react";
import { FolderPlus, Pencil, Plus, SwatchBook, Trash2, X } from "lucide-react";
import { useWorkspace, useWorkspaces } from "@/hooks/use-workspaces";
```

Add local helpers:

```tsx
function getPathName(path: string) {
  return path.split(/[/\\]/).pop() ?? path;
}

function getParentLabel(path: string) {
  const parts = path.split(/[/\\]/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 2] : "Root";
}
```

Replace the missing-workspace state with a recovery action:

```tsx
if (!workspace) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Workspace not found</p>
        <p className="text-[13px] text-muted-foreground">This workspace may have been deleted.</p>
      </div>
      <button
        type="button"
        onClick={() => currentPath && onBackToFiles?.(currentPath)}
        disabled={!currentPath}
        aria-label="Back to current folder"
        className="rounded-md border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Back to current folder
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Implement hub actions**

Inside `WorkspaceView`, read mutation functions:

```tsx
const { tags, pathTags, addToWorkspace, removeFromWorkspace } = useWorkspaces();
```

Add callbacks:

```tsx
const handleAddCurrentFolder = useCallback(() => {
  if (!workspace || !currentPath) return;
  void addToWorkspace(workspace.id, currentPath);
}, [addToWorkspace, currentPath, workspace]);

const handleAddSelectedItem = useCallback(() => {
  if (!workspace || !selectedItemPath) return;
  void addToWorkspace(workspace.id, selectedItemPath);
}, [addToWorkspace, selectedItemPath, workspace]);

const handleRemovePath = useCallback(
  (path: string) => {
    if (!workspace) return;
    void removeFromWorkspace(workspace.id, path);
  },
  [removeFromWorkspace, workspace]
);
```

- [ ] **Step 5: Implement path grouping**

Add grouped paths:

```tsx
const groupedPaths = useMemo(() => {
  if (!workspace) return [];
  const groups = new Map<string, string[]>();

  for (const path of workspace.paths) {
    const label = getParentLabel(path);
    const paths = groups.get(label) ?? [];
    paths.push(path);
    groups.set(label, paths);
  }

  return Array.from(groups.entries()).map(([label, paths]) => ({
    label,
    paths: paths.sort((left, right) => getPathName(left).localeCompare(getPathName(right))),
  }));
}, [workspace]);
```

- [ ] **Step 6: Replace the returned markup with hub structure**

Use this structure for the non-missing workspace return:

```tsx
return (
  <div className="space-y-5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
      <div className="min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: workspace.color ?? "transparent",
              border: workspace.color ? "none" : "1.5px solid currentColor",
            }}
          />
          <h2 className="truncate text-xl font-semibold tracking-tight">{workspace.name}</h2>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span>{workspace.paths.length} paths</span>
          <span>{workspaceTags.length} tags</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleAddCurrentFolder} disabled={!currentPath} aria-label="Add current folder" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          Current
        </button>
        <button type="button" onClick={handleAddSelectedItem} disabled={!selectedItemPath} aria-label="Add selected item" title={selectedItemPath ?? "No selected item"} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Selected
        </button>
        <button type="button" onClick={onRenameWorkspace} aria-label="Rename workspace" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onChangeWorkspaceColor} aria-label="Change workspace color" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <SwatchBook className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={onDeleteWorkspace} aria-label="Delete workspace" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    {workspaceTags.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {workspaceTags.map((tag) => (
          <button key={tag.id} onClick={() => onTagClick?.(tag.id)} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium text-white transition-opacity hover:opacity-80" style={{ backgroundColor: tag.color }}>
            {tag.name}
          </button>
        ))}
      </div>
    )}

    {workspace.paths.length === 0 ? (
      <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
        <p className="text-sm font-medium text-foreground">This workspace is empty</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">Add the current folder, add the selected item, or drag folders into this workspace from the sidebar.</p>
      </div>
    ) : (
      <div className="space-y-5">
        {groupedPaths.map((group) => (
          <section key={group.label} className="space-y-2">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h3>
            <div className="divide-y divide-border">
              {group.paths.map((path) => {
                const filename = getPathName(path);
                const itemTags = pathTagMap.get(path) ?? [];
                return (
                  <div key={path} className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/60">
                    <button onClick={() => onNavigate(path)} className="min-w-0 flex-1 space-y-1 text-left">
                      <span className="block truncate text-sm font-medium">{filename}</span>
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">{path}</span>
                      {itemTags.length > 0 && <TagChips tags={itemTags} />}
                    </button>
                    <button type="button" onClick={() => handleRemovePath(path)} aria-label={`Remove ${filename} from workspace`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    )}
  </div>
);
```

- [ ] **Step 7: Run hub tests to verify pass**

Run:

```powershell
npm.cmd test -- src/components/workspace-view.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit workspace hub view**

```powershell
git add src/components/workspace-view.tsx src/components/workspace-view.test.tsx
git commit -m "feat: add workspace hub management view"
```

---

### Task 3: Workspace Color API

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/lib/workspace-provider.tsx`
- Modify: `src/hooks/use-workspaces.ts`
- Test: add or update Rust tests near existing app-data command tests if present

- [ ] **Step 1: Write failing Rust test for changing workspace color**

Add a test near existing workspace command or app-data tests in `src-tauri/src/lib.rs`:

```rust
#[test]
fn test_change_workspace_color_updates_existing_workspace() {
    let mut data = AppData::default();
    data.workspaces.push(crate::app_data::Workspace {
        id: "ws1".to_string(),
        name: "Project Alpha".to_string(),
        color: Some("#ff0000".to_string()),
        paths: vec![],
    });

    let result = change_workspace_color_in_data(&mut data, "ws1", Some("#00ff00".to_string()));

    assert!(result.is_ok());
    assert_eq!(data.workspaces[0].color.as_deref(), Some("#00ff00"));
}

#[test]
fn test_change_workspace_color_rejects_invalid_hex() {
    let mut data = AppData::default();
    data.workspaces.push(crate::app_data::Workspace {
        id: "ws1".to_string(),
        name: "Project Alpha".to_string(),
        color: None,
        paths: vec![],
    });

    let result = change_workspace_color_in_data(&mut data, "ws1", Some("blue".to_string()));

    assert_eq!(
        result.unwrap_err(),
        "color must be a valid hex color (e.g., #ff0000)"
    );
}
```

- [ ] **Step 2: Run Rust color tests to verify failure**

Run:

```powershell
cargo test test_change_workspace_color
```

from `src-tauri`.

Expected: FAIL because `change_workspace_color_in_data` does not exist.

- [ ] **Step 3: Implement shared color mutation helper and Tauri command**

Add helper near existing workspace commands:

```rust
fn change_workspace_color_in_data(
    data: &mut AppData,
    id: &str,
    color: Option<String>,
) -> Result<(), String> {
    if let Some(ref c) = color {
        if !is_valid_hex(c) {
            return Err("color must be a valid hex color (e.g., #ff0000)".to_string());
        }
    }

    if let Some(ws) = data.workspaces.iter_mut().find(|w| w.id == id) {
        ws.color = color;
        Ok(())
    } else {
        Err("workspace not found".to_string())
    }
}
```

Add command:

```rust
#[tauri::command]
fn change_workspace_color(
    state: tauri::State<AppDataManager>,
    id: String,
    color: Option<String>,
) -> Result<AppData, String> {
    state.mutate(|data| change_workspace_color_in_data(data, &id, color))
}
```

Register it in the Tauri command handler next to `rename_workspace`:

```rust
change_workspace_color,
```

- [ ] **Step 4: Expose `changeWorkspaceColor` in React**

Update `WorkspaceContextType` in `src/lib/workspace-provider.tsx`:

```tsx
changeWorkspaceColor: (id: string, color?: string) => Promise<AppData | undefined>;
```

Update provider value:

```tsx
changeWorkspaceColor: (id, color) =>
  mutate("change_workspace_color", { id, color }) as Promise<AppData | undefined>,
```

Update `useWorkspaces` in `src/hooks/use-workspaces.ts`:

```tsx
changeWorkspaceColor: ctx.changeWorkspaceColor,
```

- [ ] **Step 5: Run Rust color tests and TypeScript build**

Run:

```powershell
cargo test test_change_workspace_color
npm.cmd run build
```

Expected: PASS.

- [ ] **Step 6: Commit color API**

```powershell
git add src-tauri/src/lib.rs src/lib/workspace-provider.tsx src/hooks/use-workspaces.ts
git commit -m "feat: support workspace color changes"
```

---

### Task 4: Create Workspace From Dropped Path

**Files:**
- Modify: `src/components/create-workspace-dialog.tsx`
- Test: `src/components/create-workspace-dialog.test.tsx`

- [ ] **Step 1: Write failing create callback test**

Add this test outside the rename-mode describe block or in a new create-mode describe block:

```tsx
describe("CreateWorkspaceDialog - create mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onCreated with created app data when a workspace is created", async () => {
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    const createdData = {
      workspaces: [{ id: "ws-new", name: "Dropped", color: "#3b82f6", paths: [] }],
      tags: [],
      path_tags: {},
    };
    mockCreateWorkspace.mockResolvedValueOnce(createdData);

    render(
      <CreateWorkspaceDialog
        open
        onOpenChange={onOpenChange}
        onCreated={onCreated}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Workspace name"), {
      target: { value: "Dropped" },
    });
    fireEvent.submit(screen.getByPlaceholderText("Workspace name").closest("form")!);

    await waitFor(() => {
      expect(mockCreateWorkspace).toHaveBeenCalledWith("Dropped", expect.any(String));
      expect(onCreated).toHaveBeenCalledWith(createdData);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
```

- [ ] **Step 2: Run dialog tests to verify failure**

Run:

```powershell
npm.cmd test -- src/components/create-workspace-dialog.test.tsx
```

Expected: FAIL because `onCreated` is not a supported prop.

- [ ] **Step 3: Implement `onCreated` prop**

Update imports:

```tsx
import type { AppData } from "@/lib/workspace-provider";
```

Update props:

```tsx
interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  initialColor?: string;
  onSubmit?: (name: string) => void;
  onCreated?: (data: AppData | undefined) => void;
}
```

Add prop to the function signature:

```tsx
onCreated,
```

Update create submission:

```tsx
if (isRename) {
  onSubmit?.(trimmed);
} else {
  const data = await createWorkspace(trimmed, color || undefined);
  onCreated?.(data);
}
onOpenChange(false);
```

Make `handleSubmit` async:

```tsx
const handleSubmit = useCallback(
  async (e: React.FormEvent) => {
```

Add `onCreated` to dependencies:

```tsx
[name, color, isRename, onSubmit, onCreated, createWorkspace, onOpenChange]
```

- [ ] **Step 4: Run dialog tests to verify pass**

Run:

```powershell
npm.cmd test -- src/components/create-workspace-dialog.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit create callback**

```powershell
git add src/components/create-workspace-dialog.tsx src/components/create-workspace-dialog.test.tsx
git commit -m "feat: expose workspace create result"
```

---

### Task 5: App Wiring For Hub Actions

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/FileTreeSidebar.tsx`
- Modify: `src/components/FilePane.tsx`
- Test: `src/App.integration.test.tsx` or `src/App.dual-pane.test.tsx` if existing setup can cover it

- [ ] **Step 1: Write an integration test for opening a workspace from the sidebar**

In the existing App integration test file, import `fireEvent` from Testing Library, make the Tauri `get_app_data` mock return fixture workspaces/tags instead of `null`, render the app, open the sidebar if the `Open workspace Project Alpha` button is not already visible, click the workspace row, and expect the hub title.

Core assertion:

```tsx
fireEvent.click(await screen.findByRole("button", { name: "Open workspace Project Alpha" }));
expect(await screen.findByText("Project Alpha")).toBeInTheDocument();
expect(screen.getByText("2 paths")).toBeInTheDocument();
```

- [ ] **Step 2: Run App integration test to verify failure**

Run:

```powershell
npm.cmd test -- src/App.integration.test.tsx
```

Expected: FAIL until sidebar and pane props are wired through the app shell.

- [ ] **Step 3: Add pending dropped path state in `App.tsx`**

Add state near the workspace dialog state:

```tsx
const [pendingWorkspacePath, setPendingWorkspacePath] = useState<string | null>(null);
const workspaceIdsBeforeCreateRef = useRef<Set<string>>(new Set());
```

Add helpers after `handleOpenWorkspace`:

```tsx
const handleCreateWorkspace = useCallback(() => {
  setPendingWorkspacePath(null);
  setCreateWorkspaceOpen(true);
}, []);

const handleCreateWorkspaceFromPath = useCallback((path: string) => {
  workspaceIdsBeforeCreateRef.current = new Set(workspaces.map((workspace) => workspace.id));
  setPendingWorkspacePath(path);
  setCreateWorkspaceOpen(true);
}, [workspaces]);
```

Update the `FileTreeSidebar` props:

```tsx
onCreateWorkspace={handleCreateWorkspace}
onCreateWorkspaceFromPath={handleCreateWorkspaceFromPath}
activeWorkspaceId={
  activePane === "left" && leftViewLocation.type === "workspace"
    ? leftViewLocation.workspaceId
    : activePane === "right" && rightViewLocation.type === "workspace"
      ? rightViewLocation.workspaceId
      : null
}
```

- [ ] **Step 4: Wire create-from-drop completion in `App.tsx`**

Update the create dialog:

```tsx
<CreateWorkspaceDialog
  open={createWorkspaceOpen}
  onOpenChange={(open) => {
    setCreateWorkspaceOpen(open);
    if (!open) setPendingWorkspacePath(null);
  }}
  onCreated={(data) => {
    if (!pendingWorkspacePath || !data) return;
    const workspace = data.workspaces.find(
      (candidate) => !workspaceIdsBeforeCreateRef.current.has(candidate.id)
    );
    if (workspace) {
      void addToWorkspace(workspace.id, pendingWorkspacePath);
    }
  }}
/>
```

This compares workspace ids from before and after creation. It remains correct when workspace names are duplicated.

- [ ] **Step 5: Update `FileTreeSidebar` props and pass through to sidebar**

Update `FileTreeSidebarProps`:

```tsx
activeWorkspaceId?: string | null;
onCreateWorkspaceFromPath?: (path: string) => void;
```

Destructure:

```tsx
activeWorkspaceId,
onCreateWorkspaceFromPath,
```

Pass into `WorkspaceSidebarSection`:

```tsx
activeWorkspaceId={activeWorkspaceId}
onCreateWorkspaceFromPath={onCreateWorkspaceFromPath}
```

- [ ] **Step 6: Update `FilePane` props and pass hub context**

Add props:

```tsx
onRenameWorkspace?: (workspaceId: string) => void;
onDeleteWorkspace?: (workspaceId: string) => void;
onChangeWorkspaceColor?: (workspaceId: string) => void;
onBackToFiles?: (path: string) => void;
```

Destructure them and pass to `WorkspaceView`:

```tsx
currentPath={currentPath}
selectedItemPath={ui.selectedItem?.path ?? null}
onRenameWorkspace={() => onRenameWorkspace?.(effectiveViewLocation.workspaceId)}
onDeleteWorkspace={() => onDeleteWorkspace?.(effectiveViewLocation.workspaceId)}
onChangeWorkspaceColor={() => onChangeWorkspaceColor?.(effectiveViewLocation.workspaceId)}
onBackToFiles={(path) => onViewLocationChange?.({ type: "fs", path })}
```

In `App.tsx`, add explicit targets for destructive and color actions:

```tsx
const [deleteWorkspaceTarget, setDeleteWorkspaceTarget] = useState<{ id: string; name: string } | null>(null);
const [colorTarget, setColorTarget] = useState<{ id: string; name: string; color: string } | null>(null);
```

Pass for both panes:

```tsx
onRenameWorkspace={(workspaceId) => {
  const workspace = workspaces.find((candidate) => candidate.id === workspaceId);
  if (workspace) setRenameTarget({ id: workspace.id, name: workspace.name });
}}
onDeleteWorkspace={(workspaceId) => {
  const workspace = workspaces.find((candidate) => candidate.id === workspaceId);
  if (workspace) setDeleteWorkspaceTarget({ id: workspace.id, name: workspace.name });
}}
onChangeWorkspaceColor={(workspaceId) => {
  const workspace = workspaces.find((candidate) => candidate.id === workspaceId);
  if (workspace) {
    setColorTarget({
      id: workspace.id,
      name: workspace.name,
      color: workspace.color ?? "#3b82f6",
    });
  }
}}
```

Also include `deleteWorkspace` and `changeWorkspaceColor` from `useWorkspaces()`:

```tsx
const {
  workspaces,
  tags,
  addToWorkspace,
  renameWorkspace,
  deleteWorkspace,
  changeWorkspaceColor,
} = useWorkspaces();
```

- [ ] **Step 7: Add confirmation dialog for workspace deletion**

Use existing alert-dialog primitives rather than deleting directly:

```tsx
<AlertDialog
  open={!!deleteWorkspaceTarget}
  onOpenChange={(open) => {
    if (!open) setDeleteWorkspaceTarget(null);
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
      <AlertDialogDescription>
        This removes the workspace collection. Files on disk will not be deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          if (deleteWorkspaceTarget) {
            void deleteWorkspace(deleteWorkspaceTarget.id);
          }
          setDeleteWorkspaceTarget(null);
        }}
      >
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Import the primitives from `src/components/ui/alert-dialog.tsx`.

- [ ] **Step 8: Add color edit dialog**

Use a small dialog with a native color input because the app already uses one for workspace creation:

```tsx
<Dialog
  open={!!colorTarget}
  onOpenChange={(open) => {
    if (!open) setColorTarget(null);
  }}
>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Change Workspace Color</DialogTitle>
    </DialogHeader>
    <div className="flex items-center gap-3 py-4">
      <input
        aria-label="Workspace color"
        type="color"
        value={colorTarget?.color ?? "#3b82f6"}
        onChange={(event) => {
          setColorTarget((current) =>
            current ? { ...current, color: event.target.value } : current
          );
        }}
        className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
      />
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {colorTarget?.color ?? "#3b82f6"}
      </span>
    </div>
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={() => setColorTarget(null)}>
        Cancel
      </Button>
      <Button
        type="button"
        onClick={() => {
          if (colorTarget) {
            void changeWorkspaceColor(colorTarget.id, colorTarget.color);
          }
          setColorTarget(null);
        }}
      >
        Save
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

Import `Dialog`, `DialogContent`, `DialogHeader`, and `DialogTitle` from `src/components/ui/dialog.tsx`.

- [ ] **Step 9: Run integration test to verify pass**

Run:

```powershell
npm.cmd test -- src/App.integration.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit app wiring**

```powershell
git add src/App.tsx src/components/FileTreeSidebar.tsx src/components/FilePane.tsx src/App.integration.test.tsx
git commit -m "feat: wire workspace hub actions"
```

---

### Task 6: Focused Regression Pass

**Files:**
- Verify only; no planned edits unless tests expose a defect.

- [ ] **Step 1: Run workspace-focused test suite**

Run:

```powershell
npm.cmd test -- src/components/workspace-sidebar-section.test.tsx src/components/workspace-view.test.tsx src/components/create-workspace-dialog.test.tsx src/App.integration.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run workspace color backend test**

Run from `src-tauri`:

```powershell
cargo test test_change_workspace_color
```

Expected: PASS.

- [ ] **Step 3: Run related pane and command tests**

Run:

```powershell
npm.cmd test -- src/App.dual-pane.test.tsx src/components/command-palette/CommandPaletteDialog.test.tsx src/hooks/useCommandRegistry.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run typecheck/build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS with Vite build output.

- [ ] **Step 5: Commit any regression fixes**

Only if changes were needed, stage the concrete files changed by the regression fix. For example, if the fix touches the hub view and its test:

```powershell
git add src/components/workspace-view.tsx src/components/workspace-view.test.tsx
git commit -m "fix: stabilize workspace hub regressions"
```

---

## Self-Review

- Spec coverage: sidebar launcher, visible create action, open-on-click behavior, drop handling, hub metadata/actions, grouped paths, tags, remove path, missing-workspace recovery, delete confirmation, workspace color editing, existing APIs, and test coverage are mapped to tasks.
- Scope control: no persistence schema change, no rename away from Workspaces, no replacement of the file explorer layout.
- Review resolution: workspace color editing is in scope and gets a real Tauri command plus React provider method. Workspace deletion must go through confirmation rather than calling `deleteWorkspace` directly.
- Placeholder scan: no TBD/TODO/FIXME placeholders remain.
- Type consistency: new props use `Workspace`, `AppData`, existing `FileItem`, and existing workspace provider methods.
