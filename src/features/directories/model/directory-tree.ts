import type { DirectoryTreeNode } from "../api/types";

export interface FlatDirectory {
  directory: DirectoryTreeNode;
  depth: number;
}

/** 按服务端树顺序展平目录，并保留可用于缩进的深度。 */
export function flattenDirectories(
  directories: DirectoryTreeNode[],
  depth = 0,
): FlatDirectory[] {
  const result: FlatDirectory[] = [];
  for (const directory of directories) {
    result.push({ directory, depth });
    result.push(...flattenDirectories(directory.children, depth + 1));
  }
  return result;
}

/** 计算当前已确认树中的全部非根目录数量。 */
export function countDirectories(directories: DirectoryTreeNode[]): number {
  return flattenDirectories(directories).length;
}

/** 按稳定 ID 查找目录节点。 */
export function findDirectory(
  directories: DirectoryTreeNode[],
  directoryId: string | null,
): DirectoryTreeNode | null {
  if (!directoryId) {
    return null;
  }
  return (
    flattenDirectories(directories).find(
      ({ directory }) => directory.dir_id === directoryId,
    )?.directory ?? null
  );
}

/** 返回目录的全部后代 ID，不包含目录自身。 */
export function getDescendantIds(directory: DirectoryTreeNode): Set<string> {
  return new Set(
    flattenDirectories(directory.children).map(({ directory: child }) => child.dir_id),
  );
}

/** 为移动对话框生成候选，排除当前目录及其全部后代。 */
export function getMoveTargets(
  directories: DirectoryTreeNode[],
  movingDirectoryId: string,
): FlatDirectory[] {
  const movingDirectory = findDirectory(directories, movingDirectoryId);
  if (!movingDirectory) {
    return [];
  }

  const excludedIds = getDescendantIds(movingDirectory);
  excludedIds.add(movingDirectoryId);
  return flattenDirectories(directories).filter(
    ({ directory }) => !excludedIds.has(directory.dir_id),
  );
}

/** 过滤刷新后已不存在的展开状态。 */
export function reconcileExpandedIds(
  directories: DirectoryTreeNode[],
  expandedIds: ReadonlySet<string>,
): Set<string> {
  const existingIds = new Set(
    flattenDirectories(directories).map(({ directory }) => directory.dir_id),
  );
  return new Set([...expandedIds].filter((id) => existingIds.has(id)));
}
