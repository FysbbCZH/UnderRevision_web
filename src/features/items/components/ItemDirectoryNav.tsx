import type { ItemDirectoryTreeNode } from "../api/types";
import styles from "./ItemWorkspace.module.css";

interface ItemDirectoryNavProps {
  directories: ItemDirectoryTreeNode[];
  selectedId: string | null;
  expandedIds: ReadonlySet<string>;
  onSelect: (directoryId: string | null) => void;
  onToggle: (directoryId: string) => void;
}

/** Item 工作区目录导航，显式提供 Board 顶层且不暴露内部根目录。 */
export function ItemDirectoryNav(props: ItemDirectoryNavProps) {
  return (
    <nav className={styles.directoryPanel} aria-label="Item 目录导航">
      <p className={styles.panelLabel}>位置</p>
      <button
        className={styles.directoryButton}
        type="button"
        aria-pressed={props.selectedId === null}
        onClick={() => props.onSelect(null)}
      >
        Board 顶层
      </button>
      <ul className={styles.directoryTree}>
        {props.directories.map((directory) => (
          <DirectoryNode key={directory.dir_id} directory={directory} {...props} />
        ))}
      </ul>
    </nav>
  );
}

function DirectoryNode({
  directory,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
  directories,
}: ItemDirectoryNavProps & { directory: ItemDirectoryTreeNode }) {
  const hasChildren = directory.children.length > 0;
  const expanded = expandedIds.has(directory.dir_id);
  return (
    <li>
      <div className={styles.directoryRow}>
        {hasChildren ? (
          <button
            className={styles.expandButton}
            type="button"
            aria-label={`${expanded ? "折叠" : "展开"}目录 ${directory.dir_name}`}
            onClick={() => onToggle(directory.dir_id)}
          >
            {expanded ? "−" : "+"}
          </button>
        ) : <span className={styles.leafMarker}>·</span>}
        <button
          className={styles.directoryButton}
          type="button"
          aria-pressed={selectedId === directory.dir_id}
          onClick={() => onSelect(directory.dir_id)}
        >
          {directory.dir_name}
        </button>
      </div>
      {hasChildren && expanded ? (
        <ul className={styles.directoryChildren}>
          {directory.children.map((child) => (
            <DirectoryNode
              key={child.dir_id}
              directory={child}
              directories={directories}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
