import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/web/components/ui/context-menu";
import { NodeApi } from "react-arborist";
import { TreeDataItem } from "../src/App";
import { MouseEventHandler, useMemo } from "react";
import { useAppState } from "../src/AppState";
import { GetNodePath } from "../lib/utils";

interface ContextMenuOption {
  label: string;
  onClick: MouseEventHandler<HTMLDivElement>;
  disabled?: boolean;
}

export const Context = (props: {
  children: React.ReactNode;
  node?: NodeApi<TreeDataItem>;
  onDeleteFile: any;
}) => {
  const { packFileEntries, setPackFileEntries } = useAppState();

  const createNewFile = async (name: string) => {
    if (packFileEntries.some((entry) => entry.name === name)) {
      return;
    }
    const entry = await window.electron.createPackFile(name);
    setPackFileEntries((prev) => [...prev, entry]);
  };

  const copyExistingFile = async (existingFileIndex: number) => {
    const entry = await window.electron.copyPackFileByIndex(existingFileIndex);
    setPackFileEntries((prev) => [...prev, entry]);
  };

  const getOptions = (): ContextMenuOption[] => {
    if (props.node?.isLeaf) {
      // File

      return [
        {
          label: "Rename",
          onClick: (e) => {
            e.stopPropagation();
            props.node.edit();
          },
        },
        {
          label: "Copy",
          onClick: (e) => {
            e.stopPropagation();
            const id = props.node?.data.id.split("-")[0];
            if (id && !isNaN(+id)) {
              copyExistingFile(+id);
            }
          },
        },
        {
          label: "Delete",
          onClick: (e) => {
            e.stopPropagation();
            props.onDeleteFile(props.node);
          },
        },
      ] as ContextMenuOption[];
    }

    // Folder / Root
    return [
      {
        label: "Rename",
        disabled: !props.node,
        onClick: (e) => {
          e.stopPropagation();
          props.node.edit();
        },
      },
      {
        label: "New File",
        onClick: (e) => {
          e.stopPropagation();
          createNewFile(GetNodePath(props.node, "NewFile.xml"));
        },
      },
    ] as ContextMenuOption[];
  };

  const options = useMemo(() => getOptions(), [props.node]);

  return (
    <ContextMenu>
      <ContextMenuTrigger>{props.children}</ContextMenuTrigger>
      <ContextMenuContent>
        {options.map((option) => (
          <ContextMenuItem
            key={option.label}
            onClick={option.onClick}
            disabled={option.disabled}
          >
            {option.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
};
