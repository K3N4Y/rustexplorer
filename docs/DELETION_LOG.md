# Code Deletion Log

## [2026-04-22] Refactor Session

### Unused Dependencies Removed
- None. `npx depcheck` flagged `@fontsource-variable/geist`, `shadcn`, `tw-animate-css`, and `tailwindcss`, but each is still referenced by `src/App.css` or `vite.config.ts`.

### Unused Files Deleted
- `src/components/ui/textarea.tsx` - removed after `npx knip` recheck confirmed it was unreferenced following the `InputGroupTextarea` removal.
- Generated `src-tauri/target/**` artifacts were left in place for manual review because they are build outputs outside the safe cleanup scope.

### Duplicate Code Consolidated
- None in this pass.

### Unused Exports Removed
- `src/lib/settings-provider.tsx` - removed exported `SettingsContext`; kept internal context plus exported `useSettings` and `SettingsProvider`.
- `src/components/ui/button.tsx` - removed unused `buttonVariants` export.
- `src/components/ui/input-group.tsx` - removed unused `InputGroupText` and `InputGroupTextarea` components and their exports.
- `src/components/ui/sidebar.tsx` - made `useSidebar` internal to the module.
- `src/components/ui/dialog.tsx` - removed unused `DialogTrigger` and `DialogClose` components plus unused exports for `DialogOverlay` and `DialogPortal`.
- `src/components/ui/alert-dialog.tsx` - removed unused `AlertDialogTrigger` component plus unused exports for `AlertDialogOverlay` and `AlertDialogPortal`.
- `src/components/ui/context-menu.tsx` - removed unused submenu, checkbox, radio, label, shortcut, group, and portal wrapper components that had no references in the app.

### Commented-Out / Non-Functional UI Noise Removed
- `src/components/settings-dialog.tsx` - removed purely descriptive JSX comments that did not affect behavior.

### Impact
- Files deleted: 1
- Dependencies removed: 0
- Lines of code removed: 265 across cleanup-targeted source files
- Bundle size reduction: not measured

### Testing
- `npm run build` - passed.
- `cargo test --manifest-path "src-tauri/Cargo.toml"` - passed (0 tests in frontend-facing Rust targets).
- `npx knip` - remaining findings are limited to generated `src-tauri/target/**` artifacts.
- Standalone lint not run: no `lint` script or ESLint setup is present in `package.json`.
- Frontend static analysis is currently limited to `tsc` via `npm run build`, which enforces the strict/no-unused checks configured in `tsconfig.json`.
