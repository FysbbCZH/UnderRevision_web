import { isRecord } from "../../../shared/api/http";
import {
  BOARD_CATEGORIES,
  type BoardCategory,
  type ItemDirectoryTreeNode,
  type ItemDirectoryTreeResponse,
  type ItemResponse,
} from "./types";

const CATEGORY_SET = new Set<string>(BOARD_CATEGORIES);

/** 解析单个 ACTIVE Item，并丢弃合同之外的响应字段。 */
export function parseItemResponse(
  value: unknown,
  expectedBoardId: string,
): ItemResponse | null {
  if (!isRecord(value)) return null;
  const categories = parseCategories(value.item_category);
  const extraParams = value.extra_params;
  const directoryId = value.directory_id;
  if (
    typeof value.item_id !== "string" || !value.item_id ||
    typeof value.item_name !== "string" || !value.item_name ||
    value.item_source_type !== "SNIP" ||
    typeof value.item_source_id !== "string" || !value.item_source_id ||
    !categories ||
    (directoryId !== null && typeof directoryId !== "string") ||
    value.board_id !== expectedBoardId ||
    typeof value.creator_id !== "string" || !value.creator_id ||
    value.status !== "ACTIVE" ||
    typeof value.revision !== "string" || !value.revision ||
    (extraParams !== null && !isRecord(extraParams))
  ) {
    return null;
  }
  return {
    item_id: value.item_id,
    item_name: value.item_name,
    item_source_type: "SNIP",
    item_source_id: value.item_source_id,
    item_category: categories,
    directory_id: directoryId as string | null,
    board_id: value.board_id,
    creator_id: value.creator_id,
    status: "ACTIVE",
    revision: value.revision,
    extra_params: extraParams,
  };
}

/**
 * 解析整棵 Item 树。任何重复 ID、错误父子关系或 Item 位置都会拒绝全部数据。
 */
export function parseItemTreeResponse(
  value: unknown,
  expectedBoardId: string,
): ItemDirectoryTreeResponse | null {
  if (!isRecord(value) || !Array.isArray(value.root_items) || !Array.isArray(value.directories)) {
    return null;
  }
  const directoryIds = new Set<string>();
  const itemIds = new Set<string>();
  const rootItems = parseItems(value.root_items, expectedBoardId, null, itemIds);
  if (!rootItems) return null;

  const directories: ItemDirectoryTreeNode[] = [];
  for (const node of value.directories) {
    const parsed = parseTreeNode(node, expectedBoardId, null, directoryIds, itemIds);
    if (!parsed) return null;
    directories.push(parsed);
  }
  return { root_items: rootItems, directories };
}

function parseTreeNode(
  value: unknown,
  boardId: string,
  parentId: string | null,
  directoryIds: Set<string>,
  itemIds: Set<string>,
): ItemDirectoryTreeNode | null {
  if (!isRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.children)) {
    return null;
  }
  if (
    typeof value.dir_id !== "string" || !value.dir_id || directoryIds.has(value.dir_id) ||
    typeof value.dir_name !== "string" || !value.dir_name ||
    value.parent_id !== parentId || value.board_id !== boardId ||
    typeof value.creator_id !== "string" || !value.creator_id
  ) {
    return null;
  }
  directoryIds.add(value.dir_id);
  const items = parseItems(value.items, boardId, value.dir_id, itemIds);
  if (!items) return null;
  const children: ItemDirectoryTreeNode[] = [];
  for (const child of value.children) {
    const parsed = parseTreeNode(child, boardId, value.dir_id, directoryIds, itemIds);
    if (!parsed) return null;
    children.push(parsed);
  }
  return {
    dir_id: value.dir_id,
    dir_name: value.dir_name,
    parent_id: parentId,
    board_id: boardId,
    creator_id: value.creator_id,
    items,
    children,
  };
}

function parseItems(
  values: unknown[],
  boardId: string,
  directoryId: string | null,
  itemIds: Set<string>,
): ItemResponse[] | null {
  const items: ItemResponse[] = [];
  for (const value of values) {
    const item = parseItemResponse(value, boardId);
    if (!item || item.directory_id !== directoryId || itemIds.has(item.item_id)) return null;
    itemIds.add(item.item_id);
    items.push(item);
  }
  return items;
}

function parseCategories(value: unknown): BoardCategory[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const result: BoardCategory[] = [];
  const seen = new Set<string>();
  for (const category of value) {
    if (typeof category !== "string" || !CATEGORY_SET.has(category) || seen.has(category)) return null;
    seen.add(category);
    result.push(category as BoardCategory);
  }
  if (seen.has("ALL") && seen.size > 1) return null;
  return result;
}
