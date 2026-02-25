import ConfirmationDialog from "@/web/components/confirmation-dialog";
import { isImage, isTexture, isXml } from "@/web/lib/utils";
import { Editor, Monaco } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppState } from "./AppState";
import { X } from "lucide-react";
import { DDSViewer } from "@/web/src/DdsViewer";

export const EditorPanel = () => {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
  const {
    openedTabs,
    currentSelectedTab,
    editorSettings,
    setOpenedTabs,
    setCurrentSelectedTab,
    removeOpenFile,
  } = useAppState();

  const handleEditorDidMount = (
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (!openedTabs.find((tab) => tab.index === currentSelectedTab?.index)) {
      setCurrentSelectedTab(openedTabs[0]);
    }
  }, [openedTabs, currentSelectedTab]);

  const handleEditorChange = useCallback(
    (value: string, event: editor.IModelContentChangedEvent) => {
      const updatedTab = {
        ...currentSelectedTab,
        changed: true,
        value,
        isPreview: false,
      };
      setOpenedTabs((prevTabs) =>
        prevTabs.map((tab) =>
          tab.index === currentSelectedTab.index ? updatedTab : tab,
        ),
      );
      setCurrentSelectedTab(updatedTab);
    },
    [currentSelectedTab],
  );

  const checkIfCurrentTabChanged = (index: number) => {
    if (!openedTabs[index].changed) {
      removeOpenFile(index);
      return;
    }

    setConfirmIndex(index);
  };

  const handleCancelClose = () => {
    setConfirmIndex(null);
  };

  const handleConfirmClose = () => {
    if (confirmIndex === null) {
      return;
    }

    setConfirmIndex(null);
    removeOpenFile(confirmIndex);
  };

  const notSupported =
    !!currentSelectedTab &&
    !isXml(currentSelectedTab.name) &&
    !isImage(currentSelectedTab.name) &&
    !isTexture(currentSelectedTab.name);

  return (
    <div className="relative h-full w-full">
      {confirmIndex !== null && openedTabs[confirmIndex] && (
        <ConfirmationDialog
          isConfirmDialogOpen={confirmIndex !== null}
          onCancel={handleCancelClose}
          onConfirm={handleConfirmClose}
          onOpenChange={() => setConfirmIndex(null)}
          title={`Are you sure you want to close ${openedTabs[confirmIndex].name.split("/").pop()} ?`}
          description="You have unsaved changes. Closing will discard these changes."
        />
      )}

      {/* vs-code styled tab bar with the name, onClick to switch tabs and a close button. Middle click to close */}
      {openedTabs.length > 0 && (
        <div className="flex flex-row flex-wrap bg-gray-800 text-white">
          {openedTabs.map((tab, index) => {
            const fileName = tab.name.split("/").pop();
            const isSelected = tab.index === currentSelectedTab?.index;
            return (
              <div
                key={tab.index}
                className={`flex cursor-pointer items-center gap-1 px-2 py-1 ${isSelected ? "border-t border-blue-400 bg-gray-700" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (isSelected) {
                    return;
                  }
                  setCurrentSelectedTab(tab);
                }}
                onAuxClick={(e) => {
                  if (e.button !== 1) {
                    return;
                  }
                  e.preventDefault();

                  checkIfCurrentTabChanged(index);
                }}
              >
                <div
                  className={`flex-grow text-sm ${tab.isPreview ? "italic" : ""}`}
                >
                  {fileName}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    checkIfCurrentTabChanged(index);
                  }}
                >
                  <X size={16} />
                </button>
                {tab.changed && <div className="text-xs text-red-500">*</div>}
              </div>
            );
          })}
        </div>
      )}
      {!!currentSelectedTab && isXml(currentSelectedTab.name) && (
        <Editor
          key={currentSelectedTab.index}
          className={`h-full w-full`}
          theme="vs-dark"
          path={currentSelectedTab?.name}
          defaultLanguage="xml"
          value={currentSelectedTab?.value as string}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
          options={editorSettings}
        />
      )}
      {!!currentSelectedTab && isImage(currentSelectedTab.name) && (
        <div className="flex h-full w-full items-center justify-center">
          <img
            src={`data:image/png;base64,${currentSelectedTab.value}`}
            alt={currentSelectedTab.name}
          />
        </div>
      )}
      {!!currentSelectedTab && isTexture(currentSelectedTab.name) && (
        <DDSViewer value={currentSelectedTab.value} />
      )}
      {notSupported && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-gray-500">File type not supported</div>
        </div>
      )}
      {!currentSelectedTab && (
        <div className="absolute left-0 right-0 top-0 flex h-full items-center justify-center text-gray-500">
          Select a file to view its content
        </div>
      )}
    </div>
  );
};
