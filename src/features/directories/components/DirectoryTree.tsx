import type { DirectoryTreeNode as DirectoryNode } from "../api/types";
import { DirectoryTreeNode } from "./DirectoryTreeNode";
import styles from "./DirectoryWorkspace.module.css";

interface DirectoryTreeProps {
  directories: DirectoryNode[];
  selectedId: string | null;
  expandedIds: ReadonlySet<string>;
  onSelect: (directoryId: string) => void;
  onToggle: (directoryId: string) => void;
}

/** 渲染用户可操作的非根目录树，保持服务端节点顺序。 */
export function DirectoryTree(props: DirectoryTreeProps) {
  return (
    <ul className={styles.tree} role="tree" aria-label="Board 目录树">
      {props.directories.map((directory) => (
        <DirectoryTreeNode key={directory.dir_id} directory={directory} {...props} />
      ))}
    </ul>
  );
}
