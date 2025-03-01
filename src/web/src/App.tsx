import { Input } from "@/web/components/ui/input";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NodeApi, Tree, TreeApi } from "react-arborist";
import useResizeObserver from "use-resize-observer";

// #region Monaco Editor
// @ts-expect-error
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
// @ts-expect-error
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
// @ts-expect-error
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
// @ts-expect-error
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
// @ts-expect-error
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import ImageIcon from "@/web/assets/Icons/image";
import XmlIcon from "@/web/assets/Icons/xml";
import ConfirmationDialog from "@/web/components/confirmation-dialog";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/web/components/ui/resizable";
import { useToast } from "@/web/hooks/use-toast";
import { GetNodePath, isXml } from "@/web/lib/utils";
import { useAppState } from "./AppState";
import { EditorPanel } from "./EditorPanel";

import LoadingSpinner from "@/web/assets/Icons/spinner";
import Breadcrumb from "@/web/components/breadcrumb";
import MenuBar from "@/web/components/menubar";
import { Context } from "../components/contextmenu";
import { rename } from "original-fs";

self.MonacoEnvironment = {
  getWorker(_, label: string) {
    switch (label) {
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      case "typescript":
      case "javascript":
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};
// #endregion

export interface TreeDataItem {
  id: string;
  name: string;
  editing?: boolean;
  children?: TreeDataItem[];
}

function App() {
  const { toast } = useToast();

  const [fileName, setFileName] = useState<string>("");
  const [treeData, setTreeData] = useState<TreeDataItem[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);

  const [panelSize, setPanelSize] = useState<number>(40);

  const {
    addOpenFile,
    closeAllTabs,
    currentSelectedTab,
    openedTabs,
    setOpenedTabs,
    setCurrentSelectedTab,
    editorSettings,
    packFileEntries,
    setPackFileEntries,
    updateFileTabName,
  } = useAppState();

  const [confirmDialogAction, setConfirmDialogAction] =
    useState<() => void | null>(null);

  const { ref, width, height } = useResizeObserver<HTMLDivElement>();

  const treeRef = useRef<TreeApi<TreeDataItem>>();

  useEffect(() => {
    (async () => {
      const panelSize = await window.electron.getPanelSize();
      setPanelSize(panelSize);
    })();
  }, []);

  const handleNodeSelect = useCallback(
    async (node: NodeApi<TreeDataItem>[]) => {
      if (node?.[0]?.children) {
        return;
      }
      const id = node?.[0]?.id;
      if (!id) {
        return;
      }
      const fileEntry = packFileEntries.find(
        (entry) => entry.index === +id.split("-")[0],
      );
      if (!fileEntry) {
        console.error("File entry not found");
        return;
      }

      // check if file is already open
      const tabExists = openedTabs.find((tab) => tab.index === fileEntry.index);
      if (tabExists) {
        if (tabExists.isPreview && !editorSettings.usePreview) {
          setOpenedTabs((prev) => {
            const newTabs = [...prev];
            newTabs[prev.findIndex((tab) => tab.index === fileEntry.index)] = {
              ...tabExists,
              isPreview: false,
            };
            return newTabs;
          });
          return;
        }
        setCurrentSelectedTab(tabExists);
        return;
      }

      let data: string = "";
      if (isXml(fileEntry.name)) {
        data = await window.electron.getXmlPackFileEntry(fileEntry.index);
      } else {
        data = await window.electron.getDataPackFileEntry(fileEntry.index);
      }

      addOpenFile({
        index: fileEntry.index,
        name: fileEntry.name,
        value: data,
        changed: false,
      });
    },
    [packFileEntries, openedTabs],
  );

  const onNodeFocus = async (node: NodeApi<TreeDataItem>): Promise<void> => {
    if (!node.isLeaf) {
      return;
    }

    const id = node.id;
    if (!id) {
      return;
    }

    const fileEntry = packFileEntries.find(
      (entry) => entry.index === +id.split("-")[0],
    );
    if (!fileEntry) {
      console.error("File entry not found");
      return;
    }

    const tabExists = openedTabs.find((tab) => tab.index === fileEntry.index);

    if (
      tabExists &&
      tabExists.isPreview &&
      currentSelectedTab.index === tabExists.index
    ) {
      setOpenedTabs((prev) => {
        const newTabs = [...prev];
        newTabs[prev.findIndex((tab) => tab.index === fileEntry.index)] = {
          ...tabExists,
          isPreview: false,
        };
        return newTabs;
      });
      return;
    }

    handleNodeSelect([node]);
  };

  async function loadFile() {
    const loadFile = await window.electron.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "M2D", extensions: ["m2d"] }],
    });

    if (loadFile.canceled) {
      return;
    }

    setLoading(true);

    setFileName(loadFile.filePaths[0]);
    const packFiles = await window.electron.openM2d(loadFile.filePaths[0]);
    reset();
    setPackFileEntries(packFiles);
    setLoading(false);
  }

  const onLoadFile = async () => {
    const [hasChangedFiles, message] = await window.electron.hasChangedFiles();
    if (hasChangedFiles) {
      setConfirmDialogAction(() => loadFile);
      return;
    }

    await loadFile();
  };

  const onSaveFile = async () => {
    const [hasChangedFiles, message] = await window.electron.hasChangedFiles();
    if (!hasChangedFiles) {
      toast({
        title: "No changes to save",
        description: message,
        duration: 2000,
      });
      return;
    }

    const savePath = await window.electron.showSaveDialog({
      filters: [{ name: "M2D", extensions: ["m2d"] }],
    });

    if (savePath.canceled) {
      return;
    }

    const savingToast = toast({
      title: "Saving file...",
      description: <LoadingSpinner size={16} />,
    });

    const filePath = savePath.filePath;
    const result = await window.electron.saveM2d(filePath);
    savingToast.dismiss();

    if (!result[0]) {
      toast({
        title: "Error saving file",
        description: result[1],
        duration: 5000,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: `Saved successfully in ${result[1]}`,
      duration: 2000,
    });

    // wait 1s
    await wait(1000);

    setFileName(filePath);
    const packFiles = await window.electron.openM2d(filePath);
    reset();
    setPackFileEntries(packFiles);

    toast({
      title: "New file loaded",
      duration: 2000,
    });
  };

  // wait function
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const reset = () => {
    closeAllTabs();
    setPackFileEntries([]);
    setTreeData([]);
    treeRef.current?.closeAll();
  };

  useEffect(() => {
    // files have folders names as keys for example "achieve/achieve.xml" we need to convert it to a tree structure
    const newTreeData: TreeDataItem[] = [];
    packFileEntries.forEach((entry) => {
      const path = entry.name.split("/");
      let parent = newTreeData;
      path.forEach((folderName, index) => {
        const isFile = index === path.length - 1 && folderName.includes(".");
        const existingFolder = parent.find(
          (folder) => folder.name === folderName,
        );
        if (existingFolder) {
          parent = existingFolder.children!;
          return;
        }

        const newFolder: TreeDataItem = {
          id: `${entry.index}-${folderName}-${index}`,
          name: folderName,
          children: isFile ? undefined : ([] as TreeDataItem[]),
        };
        parent.push(newFolder);
        if (!isFile) {
          parent = newFolder.children!;
        }
      });
    });

    newTreeData.sort((a, b) => a.name.localeCompare(b.name));

    setTreeData(newTreeData);
  }, [packFileEntries]);

  const renameNode = async ({
    id,
    node,
    name: newName,
  }: {
    id: string;
    node: NodeApi<TreeDataItem>;
    name: string;
  }) => {
    const fullOldName = GetNodePath(node.parent, node.data.name);
    const fullName = GetNodePath(node.parent, newName);

    const fileEntry = packFileEntries.find(
      (entry) => entry.index === +id.split("-")[0],
    );
    if (!fileEntry) {
      console.error("File entry not found");
      return;
    }

    if (node.isLeaf) {
      if (!newName.includes(".")) {
        // prevent renaming a file to a folder
        return;
      }

      // Check if the new name is already in use
      for (const entry of packFileEntries) {
        if (entry.name === fullName) {
          toast({
            title: "Error renaming file",
            description: "A file with the same name already exists",
            duration: 5000,
            variant: "destructive",
          });
          return;
        }
      }

      const [result, entry] = await window.electron.renamePackFileEntry(
        fileEntry.index,
        fullName,
      );
      if (!result) {
        console.error("Error renaming file");
        return;
      }
      updateFileTabName(fileEntry.index, entry.name);
      setPackFileEntries((prev) => {
        const newPackFileEntries = [...prev];
        newPackFileEntries[fileEntry.index - 1] = entry;
        return newPackFileEntries;
      });
      return;
    }

    // Check if the new name is already in use
    for (const entry of packFileEntries) {
      if (entry.name.startsWith(fullName)) {
        toast({
          title: "Error renaming folder",
          description: "A folder with the same name already exists",
          duration: 5000,
          variant: "destructive",
        });
        return;
      }
    }

    console.log("Renaming folder", fullName, fullOldName, newName);

    // Rename folder
    const [result, entries] = await window.electron.renamePackFolder(
      fullOldName,
      fullName,
    );
    if (!result) {
      console.error("Error renaming folder", entries);
      return;
    }

    setPackFileEntries((prev) => {
      const newPackFileEntries = [...prev];
      entries.forEach((entry) => {
        const index = newPackFileEntries.findIndex(
          (packFileEntry) => packFileEntry.index === entry.index,
        );
        newPackFileEntries[index] = entry;
      });
      return newPackFileEntries;
    });
  };

  const [deleteNode, setDeleteNode] = useState<NodeApi<TreeDataItem> | null>(
    null,
  );

  const deleteFile = async (node: NodeApi<TreeDataItem>) => {
    const id = node?.data.id.split("-")[0];
    if (id && !isNaN(+id)) {
      await window.electron.deletePackFileEntry(+id);

      const entries = packFileEntries.filter((entry) => entry.index !== +id);
      setPackFileEntries(entries);
    }
  };

  function getNodeIcon(node: NodeApi<TreeDataItem>) {
    if (node.isLeaf) {
      // get icons from here: https://github.com/material-extensions/vscode-material-icon-theme/tree/main/icons
      switch (node.data.name.split(".").pop()) {
        case "xml":
        case "xblock":
        case "flat":
          return <XmlIcon className="h-4 w-4" />;
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "bmp":
        case "webp":
        case "svg":
        case "ico":
        case "dds":
          return <ImageIcon className="h-4 w-4" />;
        default:
          return "🍁";
      }
    }

    if (node.isClosed) {
      return "🗀";
    } else {
      return "🗁";
    }
  }

  return (
    <div className="relative h-screen">
      <ConfirmationDialog
        isConfirmDialogOpen={confirmDialogAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialogAction(null);
          }
        }}
        onCancel={() => setConfirmDialogAction(null)}
        onConfirm={confirmDialogAction}
      />
      <ConfirmationDialog
        isConfirmDialogOpen={!!deleteNode}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteNode(null);
          }
        }}
        onCancel={() => setDeleteNode(null)}
        onConfirm={() => {
          setDeleteNode(null);
          deleteFile(deleteNode);
        }}
        title={`Are you sure you want to delete ${deleteNode?.data?.name}?`}
        description="This action cannot be undone."
      />
      <div className="h-full w-full text-white">
        <MenuBar
          onLoadFile={onLoadFile}
          onSaveFile={onSaveFile}
          setConfirmDialogAction={setConfirmDialogAction}
        />

        <ResizablePanelGroup
          direction="horizontal"
          style={{
            height: "calc(100% - 40px)", // 40px is the height of the menubar, but why is it hardcoded? i dont understand
          }}
        >
          <ResizablePanel
            minSize={25}
            maxSize={70}
            defaultSize={panelSize}
            onResize={async (e) => await window.electron.savePanelSize(e)}
          >
            {treeData.length > 0 && !loading && (
              <div className="ml-2 flex h-full flex-col pt-2">
                <div className="pb-2 pr-2">
                  <Breadcrumb fileName={fileName} />
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 transform text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full py-2 pl-10 pr-4"
                    />
                  </div>
                </div>
                <div
                  ref={ref}
                  className="flex-grow"
                  style={{
                    minBlockSize: 0,
                  }}
                >
                  <Context node={null} onDeleteFile={setDeleteNode}>
                    <Tree
                      ref={treeRef}
                      data={treeData}
                      openByDefault={false}
                      width={width}
                      height={height}
                      searchTerm={searchQuery}
                      searchMatch={(
                        node: NodeApi<TreeDataItem>,
                        term: string,
                      ) =>
                        node.data.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase())
                      }
                      // onContextMenu={(e) => e.stopPropagation()}
                      onFocus={onNodeFocus}
                      onRename={renameNode}
                    >
                      {({ node, style }) => {
                        const fileIndex = +node.data.id.split("-")[0];
                        const fileEntry = packFileEntries.find(
                          (entry) => entry.index === fileIndex,
                        );

                        const nodeIsSelected =
                          !node.data.id.startsWith("new") &&
                          fileEntry &&
                          currentSelectedTab?.name === fileEntry.name &&
                          node.isLeaf;

                        return (
                          <Context node={node} onDeleteFile={setDeleteNode}>
                            <div
                              style={style}
                              className={`flex cursor-pointer select-none items-center ${
                                nodeIsSelected
                                  ? "bg-gray-800"
                                  : "hover:bg-gray-800 hover:bg-opacity-40"
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                node.toggle();
                                node.select();
                              }}
                            >
                              <div className="flex-shrink-0">
                                {getNodeIcon(node)}
                              </div>
                              {node.isEditing ? (
                                <input
                                  className="ml-1 w-full text-black"
                                  type="text"
                                  onClick={(e) => e.stopPropagation()}
                                  defaultValue={node.data.name}
                                  onFocus={(e) => {
                                    // Select the fileName (anything before .)
                                    e.currentTarget.setSelectionRange(0, e.currentTarget.value.indexOf("."));
                                  }}
                                  onBlur={() => node.reset()}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      node.submit(e.currentTarget.value);
                                      e.stopPropagation();
                                    }

                                    if (e.key === "Escape") {
                                      node.reset();
                                      e.stopPropagation();
                                    }
                                  }}
                                />
                              ) : (
                                <span className="ml-1 overflow-hidden overflow-ellipsis whitespace-nowrap">
                                  {node.data.name}
                                </span>
                              )}
                            </div>
                          </Context>
                        );
                      }}
                    </Tree>
                  </Context>
                </div>
              </div>
            )}
            {treeData.length === 0 && !loading && (
              <div className="flex h-full items-center justify-center text-gray-500">
                No M2d loaded
              </div>
            )}
            {loading && (
              <div className="flex h-full items-center justify-center text-gray-500">
                <LoadingSpinner size={36} />
              </div>
            )}
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>
            <EditorPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export default App;
