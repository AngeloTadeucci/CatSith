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

    const filePath = path.join(exportDir, entry.name);
    // Make any intermediate directories
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Check if file is XML or text-based format
    const ext = path.extname(entry.name).toLowerCase();
    const isTextFile = ['.xml', '.txt', '.json', '.html', '.xsd', '.xsl', '.xblock', '.flat'].includes(ext);

    if (isTextFile) {
      // Decode as text for XML and derivatives
      let decoder = new TextDecoder("utf-8");
      let text = decoder.decode(data.getBuffer());
      if (text.includes('encoding="euc-kr"')) {
        decoder = new TextDecoder("euc-kr");
        text = decoder.decode(data.getBuffer());
      }
      fs.writeFileSync(filePath, text);
    } else {
      // Write binary data directly for other files (DDS, NIF, etc.)
      fs.writeFileSync(filePath, new Uint8Array(data.getBuffer()));
    }
  }

  return [true, "Exported successfully"];
};
