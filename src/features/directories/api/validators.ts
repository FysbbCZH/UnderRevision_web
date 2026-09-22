import { isRecord } from "../../../shared/api/http";
import type {
  DirectoryResponse,
  DirectoryTreeNode,
  DirectoryTreeResponse,
} from "./types";

/** 解析单个目录响应，并只保留合同声明字段。 */
export function parseDirectoryResponse(
  value: unknown,
  expectedBoardId: string,
): DirectoryResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.dir_id !== "string" ||
    typeof value.dir_name !== "string" ||
    (value.parent_id !== null && typeof value.parent_id !== "string") ||
    value.board_id !== expectedBoardId ||
    typeof value.creator_id !== "string"
  ) {
    return null;
  }

  return {
    dir_id: value.dir_id,
    dir_name: value.dir_name,
    parent_id: value.parent_id,
    board_id: value.board_id,
    creator_id: value.creator_id,
  };
}

/**
 * 解析完整目录树；任一节点不合规时拒绝整棵树，避免展示被修补的部分结果。
 */
export function parseDirectoryTreeResponse(
  value: unknown,
  expectedBoardId: string,
): DirectoryTreeResponse | null {
  if (!isRecord(value) || !Array.isArray(value.directories)) {
    return null;
  }

  const seenIds = new Set<string>();
  const directories: DirectoryTreeNode[] = [];
  for (const node of value.directories) {
    const parsed = parseTreeNode(node, expectedBoardId, null, seenIds);
    if (!parsed) {
      return null;
    }
    directories.push(parsed);
  }

  return { directories };
}

function parseTreeNode(
  value: unknown,
  expectedBoardId: string,
  expectedParentId: string | null,
  seenIds: Set<string>,
): DirectoryTreeNode | null {
  if (!isRecord(value) || !Array.isArray(value.children)) {
    return null;
  }

  const directory = parseDirectoryResponse(value, expectedBoardId);
  if (
    !directory ||
    directory.parent_id !== expectedParentId ||
    seenIds.has(directory.dir_id)
  ) {
    return null;
  }
  seenIds.add(directory.dir_id);

  const children: DirectoryTreeNode[] = [];
  for (const child of value.children) {
    const parsed = parseTreeNode(
      child,
      expectedBoardId,
      directory.dir_id,
      seenIds,
    );
    if (!parsed) {
      return null;
    }
    children.push(parsed);
  }

  return { ...directory, children };
}
