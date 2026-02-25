# CatSith — Code Review TODO

## Bugs

- [x] **Delete uses index as array position** (`pack-files.ts:191`) — Fixed: use `findIndex()`
- [x] **Rename updates packFileEntries by index position** (`App.tsx:378`) — Fixed: use `findIndex()`
- [x] **Duplicate Ctrl+S handlers** (`EditorPanel.tsx`, `menubar.tsx`) — Fixed: removed EditorPanel handler
- [x] **get-xml-pack-file-entry swallows errors** (`pack-files.ts`) — Fixed: re-throw error
- [x] **save-xml-pack-file-entry doesn't preserve EUC-KR encoding** (`pack-files.ts`) — Fixed: normalize declaration to utf-8 on save

## Security / Robustness

- [ ] **No m2dReader null check on most IPC handlers** (`pack-files.ts`)
  `save-xml-pack-file-entry`, `create-pack-file`, `copy-pack-file-by-index`, `rename-pack-file-entry`, `rename-pack-folder`, `delete-pack-file-entry` all crash if called before opening a file.

- [ ] **rename-pack-folder only replaces first occurrence** (`pack-files.ts:172`)
  `entry.name.replace(folderName, newName)` — if `folderName` appears twice in the path, only the first is replaced. Use prefix-aware replacement.

- [ ] **Export blocks the main process** (`export-m2d.ts:18-44`)
  Synchronous `fs.existsSync`, `fs.mkdirSync`, `fs.writeFileSync` in a loop over potentially thousands of files. Freezes the app. Use `fs.promises.*`.

## Architecture / Design

- [ ] **File tree rebuilt on every packFileEntries change** (`App.tsx:295-326`)
  O(n * depth) tree construction via `useEffect` + `useState`. Use `useMemo` instead to avoid unnecessary re-renders.

- [ ] **m2dReader is a mutable module-level global** (`events.ts:10`)
  No guard against concurrent operations. Simultaneous IPC calls can interleave on the same reader state.

- [ ] **createdPackFiles / modifiedPackFiles grow unboundedly** (`pack-files.ts:5-6`)
  Only cleared on open/save. `modifiedPackFiles` accumulates duplicate indices without deduplication.

- [ ] **Context value recreated every render** (`AppState.tsx:122-136`)
  The `value` object is a new literal each render, causing all consumers to re-render. Memoize with `useMemo`.

## Code Quality

- [ ] **Unused import** (`App.tsx:36`)
  `import { rename } from "original-fs"` — dead code, remove it.

- [ ] **`any` types in multiple places**
  - `contextmenu.tsx:22` — `onDeleteFile: any`
  - `events.ts:58` / `AppState.tsx:38` — `Record<string, any>` for editor settings

- [ ] **Inconsistent IPC return types**
  Some handlers return `[boolean, string]`, some throw, some return `undefined`. Standardize on a consistent pattern.

- [ ] **Copy breaks on filenames with multiple dots** (`pack-files.ts:136`)
  `name.split(".")[0]` + `split(".")[1]` — `foo.bar.xml` becomes `foo-Copy.bar`. Use `lastIndexOf(".")`.

- [ ] **Arbitrary `wait(1000)` after save** (`App.tsx:271`)
  Unexplained 1-second sleep before reloading. Document or remove.

- [ ] **useMemo with wrong deps in context menu** (`contextmenu.tsx:91`)
  Memo depends only on `props.node` but `getOptions` closes over `packFileEntries`. Options go stale.

## Minor

- [ ] **DdsViewer early return before hooks** (`DdsViewer.tsx:46-48`)
  Early return before `useState`/`useRef`/`useEffect` violates Rules of Hooks. Move guard after hooks.

- [ ] **Hardcoded 40px menubar height** (`App.tsx:502`)
  Use a CSS variable or ref measurement instead.
