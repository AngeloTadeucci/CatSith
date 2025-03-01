import { PackFileEntry } from "maple2-file";
import { editor } from "monaco-editor";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface FileTab {
  index: number;
  name: string;
  value: string;
  changed: boolean;
  isPreview?: boolean;
}

export interface EditorSettings
  extends editor.IStandaloneEditorConstructionOptions {
  usePreview?: boolean;
}

export interface AppStateType {
  openedTabs: FileTab[];
  currentSelectedTab: FileTab;
  editorSettings: EditorSettings;
  setOpenedTabs: React.Dispatch<React.SetStateAction<FileTab[]>>;
  setCurrentSelectedTab: React.Dispatch<React.SetStateAction<FileTab>>;
  addOpenFile: (file: FileTab) => void;
  removeOpenFile: (index: number) => void;
  closeAllTabs: () => void;
  updateFileTabName: (index: number, name: string) => void;

  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings>>;

  packFileEntries: PackFileEntry[];
  setPackFileEntries: React.Dispatch<React.SetStateAction<PackFileEntry[]>>;
}

// Create the context
const AppState = createContext<AppStateType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [packFileEntries, setPackFileEntries] = useState<PackFileEntry[]>([]);

  const [openedTabs, setOpenedTabs] = useState<FileTab[]>([]);
  const [currentSelectedTab, setCurrentSelectedTab] = useState<FileTab>(null);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    minimap: {
      enabled: true,
    },
    wordWrap: "on",
    usePreview: true,
  });

  const addOpenFile = (file: FileTab) => {
    const newFile = { ...file, isPreview: editorSettings.usePreview };
    setOpenedTabs((prev) => {
      const previewTabIndex = prev.findIndex((tab) => tab.isPreview);

      if (previewTabIndex !== -1 && editorSettings.usePreview) {
        // Replace the existing preview tab
        const newTabs = [...prev];
        newTabs[previewTabIndex] = { ...file, isPreview: true };
        return newTabs;
      } else {
        const matchingTab = prev.find((tab) => tab.index === file.index);
        if (matchingTab) {
          return prev;
        }

        return [...prev, newFile];
      }
    });

    setCurrentSelectedTab(newFile);
  };

  const removeOpenFile = (index: number) => {
    setOpenedTabs((prev) => {
      const newTabs = prev.filter((_, i) => i !== index);

      if (newTabs.length === 0) {
        setCurrentSelectedTab(null);
      }

      return newTabs;
    });
  };

  const updateFileTabName = useCallback(
    (index: number, name: string) => {
      setOpenedTabs((prev) => {
        const newTabs = [...prev];
        const tab = newTabs.find((tab) => tab.index === index);
        if (tab) {
          tab.name = name;
        }
        return newTabs;
      });
    },
    [setOpenedTabs],
  );

  const closeAllTabs = useCallback(() => {
    setOpenedTabs([]);
    setCurrentSelectedTab(null);
  }, []);

  useEffect(() => {
    (async () => {
      const settings = await window.electron.getEditorSettings();
      setEditorSettings(settings);
    })();
  }, []);

  return (
    <AppState.Provider
      value={{
        openedTabs,
        currentSelectedTab,
        editorSettings,
        setEditorSettings,
        setOpenedTabs,
        setCurrentSelectedTab,
        addOpenFile,
        removeOpenFile,
        closeAllTabs,
        updateFileTabName,
        packFileEntries,
        setPackFileEntries,
      }}
    >
      {children}
    </AppState.Provider>
  );
};

export const useAppState = (): AppStateType => {
  const context = useContext(AppState);
  if (!context) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
};
