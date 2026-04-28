# Workspace Hub UX Redesign

## Context

Rust Explorer currently treats workspaces as a sidebar section with expandable rows, drag targets, and context-menu actions. This makes workspaces discoverable only after exploration, hides important actions, and gives the main workspace view too little structure for managing many paths and tags.

The redesign promotes workspaces from a secondary sidebar utility to a first-class organization mode.

## Goals

- Make workspace creation obvious without relying on drag-and-drop discovery.
- Make opening a workspace a single, predictable click.
- Keep rename, delete, color, add-path, and remove-path actions visible in the workspace surface.
- Make large workspaces easier to scan by grouping paths and showing useful metadata.
- Bring tags into the workspace view so organization feels unified.
- Preserve existing filesystem navigation, dual-pane behavior, command palette entries, and tag filtering.

## Non-Goals

- Rename the feature away from "Workspaces".
- Change the persisted workspace/tag data model.
- Add multi-user collaboration, sync, or cloud behavior.
- Replace the existing file explorer layout.

## Recommended Approach

Use a Workspace Hub pattern:

- The sidebar becomes a compact launcher for workspaces.
- Clicking a workspace opens its hub view in the active pane.
- Expanding paths in the sidebar becomes secondary or optional.
- The main pane becomes the place where users inspect and manage a workspace.

This keeps the app dense and tool-like while making the workspace workflow more explicit.

## Sidebar Behavior

The workspace sidebar section should include:

- A `Workspaces` header with a visible create button.
- A compact row for each workspace with color, name, item count, and active state.
- Single-click open behavior for the workspace row.
- A small secondary affordance for expanding paths when useful.
- A visible drop state when dragging a file or folder over an existing workspace.
- A visible "New workspace" drop target that creates a workspace containing the dropped path.

The context menu can remain for secondary actions, but common actions should not depend on it.

## Workspace Hub View

The workspace view should replace the current simple path list with a management surface:

- Header with workspace color, name, path count, and tag count.
- Primary actions: add current folder, add selected item when available, rename, change color, delete.
- Tags used by paths in the workspace, clickable as filters.
- Paths grouped by base folder or parent location.
- Each path row showing display name, full path, tags, and a remove action.
- Empty state with actions to add the current folder, add the selected item, or drop a path.

Path grouping should be deterministic and simple. A practical first version can group by the immediate parent directory label and show the full path as supporting text.

## Data Flow

Use the existing workspace provider APIs:

- `createWorkspace(name, color)`
- `renameWorkspace(id, name)`
- `deleteWorkspace(id)`
- `addToWorkspace(workspaceId, path)`
- `removeFromWorkspace(workspaceId, path)`
- existing tag and path-tag data

No persistence schema change is required.

The app shell should pass enough context into workspace views to support "add current folder" and "add selected item". If no selected item exists, that action should be hidden or disabled.

## Interaction Details

- Clicking a workspace row opens the workspace in the active pane.
- Dragging a file/folder over a workspace row highlights the row and shows copy intent.
- Dropping on a workspace row adds that path and confirms with a toast.
- Dropping on the create target opens the create dialog with the dropped path queued for insertion after create.
- Removing a path should be a visible row action with a confirmation only if the app already uses confirmation for similar destructive organization actions.
- Deleting a workspace should use confirmation because it removes an entire collection.

## Error Handling

- Failed workspace mutations should keep the current UI state and show an error toast.
- If a workspace is missing, show a recovery state with a way back to filesystem navigation.
- If a path no longer exists, keep it listed but visually mark it as unavailable once path validation exists. Path validation is not required for the first implementation.

## Testing

Cover the redesign with focused component and integration tests:

- Sidebar renders create button, workspace counts, and active state.
- Clicking a workspace opens it in the active pane.
- Dragging/dropping onto an existing workspace calls `addToWorkspace`.
- Creating from a drop target creates a workspace and adds the dropped path.
- Workspace hub shows grouped paths, tags, empty state, and row remove actions.
- Rename/delete/color actions remain reachable.
- Existing workspace command palette entries still open the correct workspace.

## Implementation Notes

Likely touched areas:

- `src/components/workspace-sidebar-section.tsx`
- `src/components/workspace-view.tsx`
- `src/components/create-workspace-dialog.tsx`
- `src/App.tsx`
- workspace-related tests in `src/components` and integration coverage where needed

The first implementation should prioritize structure and behavior over visual polish. Once the flow is correct, refine density, spacing, icon buttons, and active states.
