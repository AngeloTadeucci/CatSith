import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/web/components/ui/menubar";
import { toast } from "@/web/hooks/use-toast";
import { isImage, isXml } from "@/web/lib/utils";
import { EditorSettings, useAppState } from "@/web/src/AppState";
import { Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "../assets/Icons/spinner";

interface MenuBarProps {
  setConfirmDialogAction: (action: () => void) => void;
  onSaveFile: () => void;
  onLoadFile: () => void;
}

const MenuBar = ({
  setConfirmDialogAction,
  onSaveFile,
  onLoadFile,
}: MenuBarProps) => {
  const [appVersion, setAppVersion] = useState<string>("1.0.0");
  const [latestVersion, setLatestVersion] = useState<string>("0.0.0");

  const {
    currentSelectedTab,
    setOpenedTabs,
    editorSettings,
    setEditorSettings,
    packFileEntries,
  } = useAppState();

  useEffect(() => {
    (async () => {
      const version = await window.electron.getAppVersion();
      setAppVersion(version);

      try {
        const latestVersionReq = await fetch(
          "https://api.github.com/repos/AngeloTadeucci/CatSith/releases/latest",
        );

        if (latestVersionReq.ok) {
          const json = await latestVersionReq.json();

          const latestVersion = json.tag_name.replace("v", "");
          setLatestVersion(latestVersion);
        }
      } catch (error) {
        // do nothing
      }
    })();
  }, []);

  const exportM2d = async () => {
    const exportingToast = toast({
      title: "Exporting m2d...",
      description: <LoadingSpinner size={16} />,
      duration: 0,
    });
    const [result, message] = await window.electron.exportM2d();
    exportingToast.dismiss();
    if (!result) {
      toast({
        title: "Error exporting m2d",
        description: message,
        duration: 5000,
      });
      return;
    }
    toast({
      title: "Exported successfully",
      duration: 2000,
    });
  };

  const onSaveTab = async () => {
    if (!currentSelectedTab) {
      console.error("No tab selected");
      return;
    }

    if (!currentSelectedTab.changed) {
      console.error("No changes to save");
      return;
    }

    if (isXml(currentSelectedTab.name)) {
      const result = await window.electron.saveXmlPackFileEntry(
        currentSelectedTab.index,
        currentSelectedTab.value as string,
      );

      if (result[0]) {
        setOpenedTabs((prevTabs) =>
          prevTabs.map((tab) =>
            tab.index === currentSelectedTab.index
              ? { ...tab, changed: false }
              : tab,
          ),
        );

        toast({
          title: `${currentSelectedTab.name.split("/").pop()} saved`,
          duration: 2000,
        });
      } else {
        toast({
          title: "Error saving file",
          description: result[1],
          duration: 5000,
        });
      }

      return;
    }

    if (isImage(currentSelectedTab.name)) {
      // const result = await window.electron.saveDataPackFileEntry(
      //   currentSelectedTab.index,
      //   currentSelectedTab.value, //TODO: fix this
      // );

      // if (result[0]) {
      //   setOpenedTabs((prevTabs) =>
      //     prevTabs.map((tab) =>
      //       tab.index === currentSelectedTab.index
      //         ? { ...tab, changed: false }
      //         : tab,
      //     ),
      //   );
      //   toast({
      //     title: "File saved",
      //     duration: 2000,
      //   });
      // } else {
      //   toast({
      //     title: "Error saving file",
      //     description: result[1],
      //     duration: 5000,
      //   });
      // }

      return;
    }
  };

  const saveShortcut = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "s" && e.ctrlKey) {
        e.preventDefault();
        onSaveTab();
      }
    },
    [onSaveTab],
  );

  useEffect(() => {
    window.addEventListener("keydown", saveShortcut);
    return () => {
      window.removeEventListener("keydown", saveShortcut);
    };
  }, [saveShortcut]);

  const onExit = async () => {
    const [changedFiles, message] = await window.electron.hasChangedFiles();
    if (changedFiles) {
      return setConfirmDialogAction(() => window.electron.exitApp);
    }

    return window.electron.exitApp();
  };

  return (
    <Menubar>
      <MenubarMenu>
        <a
          href="https://github.com/AngeloTadeucci/CatSith"
          target="_blank"
          className="mx-2"
          draggable="false"
        >
          CatSith
        </a>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onClick={onLoadFile}>Load m2d</MenubarItem>
          <MenubarItem onClick={onSaveFile}>Save m2d</MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onSaveTab}>
            Save File <MenubarShortcut>Ctrl + S</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={exportM2d} disabled={packFileEntries.length === 0}>
            Export m2d
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onClick={onExit}>Exit</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Editor</MenubarTrigger>
        <MenubarContent>
          <MenubarSub>
            <MenubarSubTrigger>Word Wrap</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem
                onClick={async () => {
                  const settings = {
                    ...editorSettings,
                    wordWrap: editorSettings.wordWrap === "on" ? "off" : "on",
                  } as EditorSettings;
                  setEditorSettings(settings);

                  await window.electron.saveEditorSettings(settings);
                }}
              >
                {editorSettings.wordWrap === "on" ? (
                  <div className="flex items-center gap-2">
                    <Check size={16} /> On
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <X size={16} /> Off
                  </div>
                )}
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>Minimap</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem
                onClick={async () => {
                  const settings = {
                    ...editorSettings,
                    minimap: {
                      enabled: !editorSettings.minimap.enabled,
                    },
                  };
                  setEditorSettings(settings);

                  await window.electron.saveEditorSettings(settings);
                }}
              >
                {editorSettings.minimap.enabled ? (
                  <div className="flex items-center gap-2">
                    <Check size={16} /> Enabled
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <X size={16} /> Disabled
                  </div>
                )}
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>Preview</MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem
                onClick={async () => {
                  const settings = {
                    ...editorSettings,
                    usePreview: !editorSettings.usePreview,
                  };
                  setEditorSettings(settings);

                  await window.electron.saveEditorSettings(settings);
                }}
              >
                {editorSettings.usePreview ? (
                  <div className="flex items-center gap-2">
                    <Check size={16} /> Enabled
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <X size={16} /> Disabled
                  </div>
                )}
              </MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>About</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>v{appVersion}</MenubarItem>
          {latestVersion !== "0.0.0" && (
            <>
              <MenubarSeparator />
              <MenubarItem>
                {latestVersion === appVersion
                  ? `Up to date`
                  : `New version available: v${latestVersion}`}
              </MenubarItem>
            </>
          )}
        </MenubarContent>
      </MenubarMenu>
      <div
        className="h-full w-full flex-grow"
        style={{
          //@ts-expect-error
          WebkitAppRegion: "drag",
        }}
      />
    </Menubar>
  );
};

export default MenuBar;
