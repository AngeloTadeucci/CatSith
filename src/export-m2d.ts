import path from "path";
import fs from "fs";
import { dialog } from "electron";
import { m2dReader } from "./events";

export const ExportM2d = async () => {
  const result = await dialog.showOpenDialog({
    title: "Select export directory",
    properties: ["openDirectory"],
  });

  if (result.canceled) {
    return [false, "Export directory not selected"];
  }

  const exportDir = result.filePaths[0];

  for (const entry of m2dReader.files) {
    const data = entry.changed ? entry.data : m2dReader.getBytes(entry);

    let decoder = new TextDecoder("utf-8");
    let text = decoder.decode(data.getBuffer());
    if (text.includes('encoding="euc-kr"')) {
      decoder = new TextDecoder("euc-kr");
      text = decoder.decode(data.getBuffer());
    }

    const filePath = path.join(exportDir, entry.name);
    // Make any intermediate directories
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, text);
  }

  return [true, "Exported successfully"];
};
