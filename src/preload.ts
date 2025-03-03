import { PackFileEntry } from "maple2-file/dist/crypto/common/PackFileEntry";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  exitApp: () => ipcRenderer.invoke("exit-app"),
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke("show-open-dialog", options),
  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke("show-save-dialog", options),

  openM2d: (filePath: string) => ipcRenderer.invoke("open-m2d", filePath),
  saveM2d: (filePath: string) => ipcRenderer.invoke("save-m2d", filePath),
  exportM2d: () => ipcRenderer.invoke("export-m2d"),

  getXmlPackFileEntry: (packFileEntry: PackFileEntry) =>
    ipcRenderer.invoke("get-xml-pack-file-entry", packFileEntry),
  getDataPackFileEntry: (packFileEntry: PackFileEntry) =>
    ipcRenderer.invoke("get-data-pack-file-entry", packFileEntry),

  saveXmlPackFileEntry: (packFileEntryIndex: number, value: string) =>
    ipcRenderer.invoke("save-xml-pack-file-entry", packFileEntryIndex, value),
  saveDataPackFileEntry: (packFileEntryIndex: number, value: Buffer) =>
    ipcRenderer.invoke("save-data-pack-file-entry", packFileEntryIndex, value),

  copyPackFileByIndex: (packFileEntryIndex: number) => ipcRenderer.invoke("copy-pack-file-by-index", packFileEntryIndex),
  createPackFile: (name: string) => ipcRenderer.invoke("create-pack-file", name),
  renamePackFileEntry: (packFileEntryIndex: number, name: string) => ipcRenderer.invoke("rename-pack-file-entry", packFileEntryIndex, name),
  renamePackFolder: (folderName: string, newName: string) => ipcRenderer.invoke("rename-pack-folder", folderName, newName),
  deletePackFileEntry: (packFileEntryIndex: number) => ipcRenderer.invoke("delete-pack-file-entry", packFileEntryIndex),

  hasChangedFiles: () => ipcRenderer.invoke("has-changed-files"),

  saveEditorSettings: (data: Record<string, any>) =>
    ipcRenderer.invoke("save-editor-settings", data),
  getEditorSettings: () => ipcRenderer.invoke("get-editor-settings"),

  savePanelSize: (size: number) => ipcRenderer.invoke("save-panel-size", size),
  getPanelSize: () => ipcRenderer.invoke("get-panel-size"),
});
