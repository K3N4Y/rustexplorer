# Fuzzy File Search Design

Date: 2026-04-29

## Goal

Add an asynchronous, instant-feeling fuzzy file search for the active folder and its subfolders. The search should match file and folder names plus paths relative to the current folder, without searching file contents.

The target behavior is command-palette-like file discovery:

- `appcs` finds `src/App.css`.
- `srcappcs` finds `src/App.css`.
- `srchbar` finds `src/components/SearchBar.tsx`.
- `apptsx` finds `src/App.tsx`.

The first version must include real Rust-side cancellation so each new query stops stale filesystem work instead of only ignoring stale UI events.

## Current Context

The app already has a useful search foundation:

- `src/components/SearchBar.tsx` debounces input, invokes a Tauri command, listens for `search-results-chunk` and `search-done`, and ignores events whose `request_id` is no longer active.
- `src-tauri/src/lib.rs` has `search_with_ignore`, which runs on `spawn_blocking`, walks the filesystem with `ignore::WalkBuilder`, emits result chunks, and supports configurable thread count.
- `should_search_entry` skips heavy default folders such as `.git`, `node_modules`, `dist`, `target`, `.next`, and similar generated/cache directories.
- `FileExplorer` already disables manual sorting while search is active, preserving backend result order.

The missing pieces are fuzzy scoring, path-relative matching, result ranking, and real cancellation.

## Non-Goals

- Do not search file contents.
- Do not build a persistent filesystem index in the first version.
- Do not introduce a third-party fuzzy crate in the first version.
- Do not redesign the SearchBar UI.
- Do not change workspace or tag search behavior.

## Proposed Approach

Implement a streaming top-N fuzzy search in Rust using the existing `ignore::WalkBuilder` traversal.

The new command should be named `search_files_fuzzy` unless implementation review finds that evolving `search_with_ignore` is simpler and preserves compatibility. The command receives:

- `query`: user input.
- `path`: active folder root.
- `threads`: configured search thread count.
- `request_id`: UI-generated identifier.
- `limit`: optional maximum number of ranked results to emit, with a conservative default.

Each filesystem entry gets two candidate strings:

- `name`: the final file or folder name.
- `relative_path`: the path relative to the searched root, using normalized separators for matching.

The matcher scores both candidates. A name match receives an additional bonus so short direct matches outrank long path-only matches. The best score for the entry determines whether it belongs in the result set.

## Fuzzy Matcher

The first matcher is a small Rust implementation, not a new dependency. It should accept a match when the query characters appear as an ordered subsequence in the candidate.

Scoring rules:

- Bonus when the match begins at the start of the candidate.
- Bonus when a matched character appears after a separator: `/`, `\`, `.`, `_`, `-`, or space.
- Bonus for camelCase or PascalCase boundaries.
- Bonus for matches in the file or folder name over matches only in the relative path.
- Penalty for long gaps between matched characters.
- Penalty for long relative paths.
- Tie-break by shallower path depth, then case-insensitive alphabetical order.

Matching should be case-insensitive. Path separators should be normalized for scoring, but emitted result paths must keep the real platform path.

## Streaming And Ranking

Rust should maintain a bounded top-N result set while walking. The UI should receive ranked snapshots or chunks often enough to feel live, while avoiding excessive event spam.

Recommended behavior:

- Keep a top-N collection ordered by score.
- Emit periodic chunks/snapshots when enough new candidates are found or after a short interval.
- Emit a final `search-done` event with the final total accepted count.
- Preserve the current event filtering by `request_id` on the React side.

If implementation complexity is high, the first implementation may emit sorted chunks instead of full snapshots, as long as the final visible order is ranked and stable enough for normal use.

## Cancellation

Cancellation is required in the first version.

The Rust layer should keep shared cancellation state for active searches. Starting a new search marks older search work as cancelled before launching the next walker.

Implementation shape:

- Store an `Arc<AtomicBool>` cancellation token for active search work.
- When a new search starts, flip previous active token(s) to cancelled.
- Worker closures check the token frequently.
- If cancelled, return `ignore::WalkState::Quit`.
- The emitter thread exits cleanly after channels close.
- Cancelled searches should not emit a final `search-done` that the UI treats as active completion.

The UI should still keep `request_id` filtering as a second line of defense.

## React Behavior

`SearchBar.tsx` should keep the current interaction model:

- Empty query clears search and reloads the active folder.
- Non-empty query activates search mode and replaces the active pane contents with results.
- Spinner shows while search is active.
- Result count updates as results arrive.
- Old events are ignored when `request_id` no longer matches.

The debounce can be reduced from `300ms` to around `100ms` after cancellation exists. This should improve responsiveness without stacking stale filesystem walks.

The SearchBar should invoke the new fuzzy command and pass the active pane path, thread count, request id, and result limit.

## Error Handling

Invalid or inaccessible paths should continue returning clear command errors using the existing path validation pattern.

Filesystem entries that fail metadata reads should be skipped rather than failing the whole search.

If search invocation fails, the UI should reset search state and show the existing toast error path.

If a search is cancelled, cancellation should be treated as normal control flow, not as a user-visible error.

## Performance Expectations

The first usable result should appear quickly on ordinary project folders. Large trees should not freeze the UI because traversal remains on blocking Rust work and results arrive through events.

The search should continue honoring default excluded directories to avoid expensive generated folders. Thread count remains clamped to a safe range.

The first version intentionally avoids persistent indexing. If later profiling shows repeated searches over very large folders are still too slow, a per-folder cache or session index can be designed as a separate feature.

## Testing Plan

Rust unit tests:

- `appcs` matches `App.css`.
- `srcappcs` matches `src/App.css`.
- `srchbar` matches `src/components/SearchBar.tsx`.
- A direct name match outranks a weaker long path match.
- Separator and camelCase boundaries improve score.
- Non-subsequence queries do not match.
- `should_search_entry` continues skipping default excluded directories.
- Cancellation token causes the walker callback to quit.

React tests:

- SearchBar invokes the fuzzy command with `query`, `path`, `threads`, `requestId`, and limit.
- SearchBar ignores stale chunks whose `request_id` does not match the active request.
- Clearing input clears active request state and reloads the folder.
- Debounce prevents immediate invocation on every keystroke.

Integration expectations:

- Search results preserve backend ranking while search mode is active.
- Manual sorting remains disabled during search mode.
- The active pane receives results; inactive pane behavior remains unchanged.

## Rollout

1. Add matcher helpers and Rust tests.
2. Add cancellation state and command wiring.
3. Connect SearchBar to the fuzzy command and shorter debounce.
4. Add or update React tests around request ids and clearing behavior.
5. Run Rust and frontend verification.

This keeps the feature focused: fuzzy name/path search first, content search and persistent indexing later only if they become necessary.
