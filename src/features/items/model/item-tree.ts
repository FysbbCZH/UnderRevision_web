import type {
  ItemDirectoryTreeNode,
  ItemDirectoryTreeResponse,
  ItemResponse,
} from "../api/types";

export interface ItemLocationOption {
  id: string | null;
  label: string;
  depth: number;
}

/** 递归统计树中全部 Item，不依赖服务端额外 total 字段。 */
export function countItems(tree: ItemDirectoryTreeResponse): number {
  return tree.root_items.length + countDirectoryItems(tree.directories);
}

/** 查找非根目录；null 始终表示用户可见的 Board 顶层。 */
export function findItemDirectory(
  directories: ItemDirectoryTreeNode[],
  directoryId: string | null,
): ItemDirectoryTreeNode | null {
  if (directoryId === null) return null;
  for (const directory of directories) {
    if (directory.dir_id === directoryId) return directory;
    const nested = findItemDirectory(directory.children, directoryId);
    if (nested) return nested;
  }
  return null;
}

/** 返回当前目录的直属 Item，保持服务端顺序且不混入子目录内容。 */
export function itemsInDirectory(
  tree: ItemDirectoryTreeResponse,
  directoryId: string | null,
): ItemResponse[] {
  return directoryId === null
    ? tree.root_items
    : findItemDirectory(tree.directories, directoryId)?.items ?? [];
}

/** 全树查找 Item，用于刷新后校准选择。 */
export function findItem(
  tree: ItemDirectoryTreeResponse,
  itemId: string | null,
): ItemResponse | null {
  if (itemId === null) return null;
  const root = tree.root_items.find((item) => item.item_id === itemId);
  if (root) return root;
  return findItemInDirectories(tree.directories, itemId);
}

/** 生成位置选择项；仅暴露 null 顶层和活动目录 ID。 */
export function buildLocationOptions(
  directories: ItemDirectoryTreeNode[],
): ItemLocationOption[] {
  const options: ItemLocationOption[] = [{ id: null, label: "Board 顶层", depth: 0 }];
  appendLocationOptions(directories, 0, options);
  return options;
}

/** 刷新后只保留仍存在的目录展开状态。 */
export function reconcileExpandedDirectoryIds(
  directories: ItemDirectoryTreeNode[],
  expandedIds: Set<string>,
): Set<string> {
  const activeIds = new Set(buildLocationOptions(directories).flatMap((option) =>
    option.id === null ? [] : [option.id],
  ));
  return new Set([...expandedIds].filter((id) => activeIds.has(id)));
}

function countDirectoryItems(directories: ItemDirectoryTreeNode[]): number {
  return directories.reduce(
    (sum, directory) => sum + directory.items.length + countDirectoryItems(directory.children),
    0,
  );
}

function findItemInDirectories(
  directories: ItemDirectoryTreeNode[],
  itemId: string,
): ItemResponse | null {
  for (const directory of directories) {
    const ownItem = directory.items.find((item) => item.item_id === itemId);
    if (ownItem) return ownItem;
    const nested = findItemInDirectories(directory.children, itemId);
    if (nested) return nested;
  }
  return null;
}

function appendLocationOptions(
  directories: ItemDirectoryTreeNode[],
  depth: number,
  options: ItemLocationOption[],
): void {
  for (const directory of directories) {
    options.push({ id: directory.dir_id, label: directory.dir_name, depth });
    appendLocationOptions(directory.children, depth + 1, options);
  }
}
