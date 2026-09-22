import type { DirectoryTreeNode as DirectoryNode } from "../api/types";
import styles from "./DirectoryWorkspace.module.css";

interface DirectoryTreeNodeProps {
  directory: DirectoryNode;
  selectedId: string | null;
  expandedIds: ReadonlySet<string>;
  onSelect: (directoryId: string) => void;
  onToggle: (directoryId: string) => void;
}

/** 单个递归目录节点；展开与选择使用彼此独立的按钮。 */
export function DirectoryTreeNode({
  directory,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: DirectoryTreeNodeProps) {
  const hasChildren = directory.children.length > 0;
  const expanded = expandedIds.has(directory.dir_id);
  const selected = selectedId === directory.dir_id;

  return (
    <li
      className={styles.treeItem}
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
    >
      <div className={styles.treeRow} data-selected={selected}>
        {hasChildren ? (
          <button
            className={styles.expandButton}
            type="button"
            aria-label={`${expanded ? "折叠" : "展开"}目录 ${directory.dir_name}`}
            onClick={() => onToggle(directory.dir_id)}
          >
            <span aria-hidden="true">{expanded ? "−" : "+"}</span>
          </button>
        ) : (
          <span className={styles.leafMarker} aria-hidden="true">
            ·
          </span>
        )}
        <button
          className={styles.selectButton}
          type="button"
          aria-pressed={selected}
          onClick={() => onSelect(directory.dir_id)}
        >
          <span>{directory.dir_name}</span>
          {hasChildren ? <small>{directory.children.length} 个子目录</small> : null}
        </button>
      </div>
      {hasChildren && expanded ? (
        <ul className={styles.treeGroup} role="group">
          {directory.children.map((child) => (
            <DirectoryTreeNode
              key={child.dir_id}
              directory={child}
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
