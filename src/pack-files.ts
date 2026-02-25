import { ipcMain } from "electron";
import { PackFileEntry } from "maple2-file";
import { m2dReader } from "./events";

export let createdPackFiles = [] as PackFileEntry[];
export let modifiedPackFiles = [] as number[];

export const clearPackFiles = () => {
  createdPackFiles = [];
  modifiedPackFiles = [];
};

ipcMain.handle(
  "get-data-pack-file-entry",
  async (event, packFileEntryIndex: number): Promise<string> => {
    if (!m2dReader) {
      throw new Error("M2D reader not initialized");
    }

    const packEntry = m2dReader.files.find(
      (entry) => entry.index === packFileEntryIndex,
    );
    if (!packEntry) {
      throw new Error("Pack file entry not found");
    }
    let data;
    if (packEntry.changed) {
      data = packEntry.data;
    } else {
      data = m2dReader.getBytes(packEntry);
    }

    return data.getBuffer().toString("base64");
  },
);

ipcMain.handle(
  "get-xml-pack-file-entry",
  async (event, packFileEntryIndex: number) => {
    if (!m2dReader) {
      throw new Error("M2D reader not initialized");
    }

    try {
      const packEntry = m2dReader.files.find(
        (entry) => entry.index === packFileEntryIndex,
      );
      if (!packEntry) {
        throw new Error("Pack file entry not found");
      }
      let data;
      if (packEntry.changed) {
        data = packEntry.data;
      } else {
        data = m2dReader.getBytes(packEntry);
      }

      if (!data) {
        throw new Error("Data not found");
      }

      let decoder = new TextDecoder("utf-8");
      const text = decoder.decode(data.getBuffer());
      if (text.includes('encoding="euc-kr"')) {
        decoder = new TextDecoder("euc-kr");
        return decoder.decode(data.getBuffer());
      }
      return text;
    } catch (error) {
      console.error("Error reading XML", error);
      throw error;
    }
  },
);

ipcMain.handle(
  "save-xml-pack-file-entry",
  async (event, packFileEntryIndex: number, xml: string) => {
    const packFileEntry = m2dReader.files.find(
      (entry) => entry.index === packFileEntryIndex,
    );
    if (!packFileEntry) {
      return [false, "Pack file entry not found"];
    }

    packFileEntry.setData(xml);

    return [true, "Saved XML"];
  },
);

ipcMain.handle(
  "save-data-pack-file-entry",
  async (event, packFileEntryIndex: number, data: Buffer) => {
    const packFileEntry = m2dReader.files.find(
      (entry) => entry.index === packFileEntryIndex,
    );
    if (!packFileEntry) {
      return [false, "Pack file entry not found"];
    }

    packFileEntry.setData(data);

    return [true, "Saved data"];
  },
);

ipcMain.handle("create-pack-file", async (event, name: string) => {
  const packFileEntry = new PackFileEntry(
    m2dReader.files.length + 1,
    "",
    name,
    "",
    null,
    null,
    false,
  );

  m2dReader.files.push(packFileEntry);
  createdPackFiles.push(packFileEntry);

  return packFileEntry;
});
ipcMain.handle(
  "copy-pack-file-by-index",
  async (event, packFileEntryIndex: number) => {
    const packFileEntry = m2dReader.files.find(
      (entry) => entry.index === packFileEntryIndex,
    );
    if (!packFileEntry) {
      return [false, "Pack file entry not found"];
    }
    const newEntry = packFileEntry.createCopy();
    if (!newEntry.data) {
      newEntry.setData(m2dReader.getBytes(packFileEntry).getBuffer());
    }
    newEntry.name = `${packFileEntry.name.split(".")[0]}-Copy.${packFileEntry.name.split(".")[1]}`;
    newEntry.index = m2dReader.files.length + 1;
    m2dReader.files.push(newEntry);

    return newEntry;
  },
);

ipcMain.handle(
  "rename-pack-file-entry",
  async (event, packFileEntryIndex: number, name: string) => {
    const packFileEntry = m2dReader.files.find(
      (entry) => entry.index === packFileEntryIndex,
    );
    if (!packFileEntry) {
      return [false, "Pack file entry not found"];
    }

    packFileEntry.name = name;
    modifiedPackFiles.push(packFileEntry.index);

    return [true, packFileEntry];
  },
);

ipcMain.handle(
  "rename-pack-folder",
  async (event, folderName: string, newName: string) => {
    const packFileEntries = m2dReader.files.filter((entry) =>
      entry.name.startsWith(folderName),
    );
    if (packFileEntries.length === 0) {
      return [false, "Pack file entries not found"];
    }

    packFileEntries.forEach((entry) => {
      entry.name = entry.name.replace(folderName, newName);

      modifiedPackFiles.push(entry.index);
    });

    return [true, packFileEntries];
  },
);

ipcMain.handle(
  "delete-pack-file-entry",
  async (event, packFileEntryIndex: number) => {
    const packFileEntry = m2dReader.files.find(
      (entry) => entry.index === packFileEntryIndex,
    );
    if (!packFileEntry) {
      return [false, "Pack file entry not found"];
    }

    const arrayIndex = m2dReader.files.findIndex(
      (entry) => entry.index === packFileEntryIndex,
    );
    if (arrayIndex !== -1) {
      m2dReader.files.splice(arrayIndex, 1);
    }
    modifiedPackFiles.push(packFileEntryIndex);

    return [true, packFileEntry];
  },
);

ipcMain.handle("has-changed-files", async (event) => {
  if (!m2dReader) {
    return [false, "No m2d file open"];
  }

  if (createdPackFiles.length > 0 && createdPackFiles.some((x) => !x.changed)) {
    return [false, "Cannot save with empty newly created files"];
  }

  if (modifiedPackFiles.length > 0) {
    return [true, "Renamed files"];
  }

  if (m2dReader.files.some((entry) => entry.changed)) {
    return [true, "Changed files"];
  }

  return [false, "No changed files"];
});
