import { clsx, type ClassValue } from "clsx";
import { NodeApi } from "react-arborist";
import { twMerge } from "tailwind-merge";
import { TreeDataItem } from "../src/App";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getExtension = (fileName: string) => {
  return fileName.split(".").pop();
};

export const isImage = (fileName: string) => {
  return ["jpg", "jpeg", "png", "gif"].includes(getExtension(fileName));
};

export const isTexture = (fileName: string) => {
  return ["dds"].includes(getExtension(fileName));
};

export const isXml = (fileName: string) => {
  return ["xml", "xblock", "flat"].includes(getExtension(fileName));
};

export const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const GetNodePath = (node: NodeApi<TreeDataItem>, name: string) => {
  while (true) {
    if (!node) break;
    if (node.isRoot) break;
    if (node.isLeaf) break;

    name = `${node.data.name}/${name}`;
    node = node.parent;
  }

  return name;
};
