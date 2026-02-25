# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is CatSith?

CatSith is an Electron desktop app for editing MapleStory 2 `.m2d` archive files. It reads/writes M2D packs via the `maple2-file` npm library, displays XML files in Monaco Editor, renders DDS textures via Three.js, and shows standard images as base64 data URIs.

## Commands

- `yarn start` — Run dev server (electron-forge)
- `yarn package` — Package the app
- `yarn make` — Build installers
- `yarn lint` — ESLint (`eslint --ext .ts,.tsx .`)
- `yarn format` — Prettier

No test framework is configured.

## Tech Stack

Electron 32 + React 18 + TypeScript + Vite (SWC) + Tailwind 3 + Radix UI (shadcn primitives) + Monaco Editor + Three.js/R3F. Package manager is Yarn 1.x.

## Architecture

Three-process Electron architecture:

- **Main process** (`src/main.ts`, `src/events.ts`, `src/pack-files.ts`, `src/export-m2d.ts`) — Window lifecycle, IPC handlers, all file I/O through `maple2-file`.
- **Preload bridge** (`src/preload.ts`) — Exposes IPC methods as `window.electron.*`. Type definitions in `src/interface.d.ts`.
- **Renderer** (`src/web/`) — React app. Entry at `src/web/renderer.tsx`, main component `src/web/src/App.tsx`.

IPC flow: Renderer calls `window.electron.foo()` → preload's `ipcRenderer.invoke` → main process `ipcMain.handle` → `maple2-file` library → filesystem.

State management is plain React Context (`src/web/src/AppState.tsx`), no external state library.

## Gotchas

- **Encoding detection**: M2D files may contain EUC-KR encoded XML. Both `pack-files.ts` and `export-m2d.ts` sniff the XML declaration to choose between UTF-8 and EUC-KR decoding. If you touch file reading/exporting, preserve this logic.
- **Binary data as base64**: All binary data (DDS textures, images) crosses the IPC boundary as base64 strings. Conversion happens in `pack-files.ts` (encode) and `DdsViewer.tsx`/`EditorPanel.tsx` (decode).
- **PackFileEntry index is 1-based**: The `.index` property from `maple2-file` is 1-based, but array splice operations use `index - 1`. See `pack-files.ts:191`.
- **File tree is built from flat paths**: Pack entries are flat strings like `"achieve/21100001.xml"`. `App.tsx` (around line 295) converts these to a nested tree structure on every render for `react-arborist`.
- **Preview tabs**: When `usePreview` is enabled, clicking a file replaces the current preview tab instead of opening a new one. Double-click or edit to "pin" it. Logic in `AppState.tsx:61-78`.
- **DDS flip compensation**: `DdsViewer.tsx` manually sets `flipY`, `repeat`, and `offset` on DDS textures to compensate for Three.js coordinate defaults.
- **Image save is unimplemented**: Image file saving is commented out in both `EditorPanel.tsx` and `menubar.tsx` (TODO comments). Only XML files can be saved through the UI.
- **Unused import**: `App.tsx` imports `rename` from `"original-fs"` but never uses it — leftover from earlier work.
- **Window state on Windows**: `stateKeeper.ts` disables atomic save for electron-settings due to a Windows platform issue (see comment at line 16).
- **Auto-update**: Uses GitHub Releases. `GITHUB_TOKEN` env var needed for publishing (see `.env.example`). Version check fetches GitHub API directly in `menubar.tsx`.
- **Vite path alias**: `@` is aliased to `src/web/src` only in the renderer config (`vite.renderer.config.ts`), not in main/preload.
