import { app, dialog, ipcMain } from "electron";
import { M2dReader, M2dWriter, PackFileEntry } from "maple2-file";
import settings from "electron-settings";

import logger from "electron-log/main";
import { debounce } from "./web/lib/utils";
import { ExportM2d } from "./export-m2d";
import { clearPackFiles } from "./pack-files";

export let m2dReader: M2dReader;

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("exit-app", () => {
  app.exit();
});

ipcMain.handle("show-open-dialog", async (event, options) => {
  return await dialog.showOpenDialog(options);
});

ipcMain.handle("show-save-dialog", async (event, options) => {
  return await dialog.showSaveDialog(options);
});

ipcMain.handle("open-m2d", async (event, filePath) => {
  const reader = new M2dReader(filePath);
  m2dReader = reader;
  clearPackFiles();
  return reader.files;
});

ipcMain.handle("save-m2d", async (event, filePath: string) => {
  try {
    // Note: the writer creates a copy of the read buffer & file array. Might eat a lot of memory
    const writer = M2dWriter.fromReader(m2dReader);

    if (filePath !== writer.filePath) {
      writer.filePath = filePath;
    }

    const time = Date.now();
    writer.save();
    clearPackFiles();
    return [true, `${Date.now() - time}ms`];
  } catch (error) {
    logger.error(error);
    return [false, error.message];
  }
});

ipcMain.handle("export-m2d", async (event) => {
  return await ExportM2d();
});

ipcMain.handle("save-editor-settings", async (event, data) => {
  await settings.set("editorSettings", data);
});

ipcMain.handle("get-editor-settings", async (event) => {
  const hasSettings = await settings.has("editorSettings");
  if (!hasSettings) {
    const defaultSettings = {
      minimap: {
        enabled: true,
      },
      wordWrap: "on",
      usePreview: true,
    };
    await settings.set("editorSettings", defaultSettings);
    return defaultSettings;
  }

  return await settings.get("editorSettings");
});

const saveState = debounce(async (size: number) => {
  await settings.set("panelSize", size);
}, 500);

ipcMain.handle("save-panel-size", async (event, size) => {
  saveState(size);
});

ipcMain.handle("get-panel-size", async (event) => {
  const hasSettings = await settings.has("panelSize");
  if (!hasSettings) {
    const defaultSize = 40;
    await settings.set("panelSize", defaultSize);
    return defaultSize;
  }

  return await settings.get("panelSize");
});
