import {
  BOARD_CATEGORIES,
  type BoardCategory,
  type ItemResponse,
  type UpdateItemRequest,
} from "../api/types";

export interface ItemDraft {
  itemName: string;
  directoryId: string | null;
  categories: BoardCategory[];
}

/** 校验并规范化 Item 名称。 */
export function normalizeItemName(value: string): { value: string; error: string | null } {
  const normalized = value.trim();
  if (!normalized) return { value: normalized, error: "请输入 Item 名称。" };
  if (Array.from(normalized).length > 255) {
    return { value: normalized, error: "Item 名称不能超过 255 个字符。" };
  }
  return { value: normalized, error: null };
}

/** 未选择具体类别时回落到 ALL，并维持 ALL 与其他类别互斥。 */
export function normalizeCategories(values: readonly BoardCategory[]): BoardCategory[] {
  const allowed = new Set<BoardCategory>(BOARD_CATEGORIES);
  const unique = [...new Set(values.filter((value) => allowed.has(value)))];
  if (unique.length === 0 || unique.includes("ALL")) return ["ALL"];
  return unique;
}

/** 根据已确认 Item 构造只含实际变化的 PATCH 正文。 */
export function buildItemUpdate(
  current: ItemResponse,
  draft: ItemDraft,
): { request: UpdateItemRequest; error: string | null } {
  const name = normalizeItemName(draft.itemName);
  if (name.error) return { request: {}, error: name.error };
  const categories = normalizeCategories(draft.categories);
  const request: UpdateItemRequest = {};
  if (name.value !== current.item_name) request.item_name = name.value;
  if (draft.directoryId !== current.directory_id) request.directory_id = draft.directoryId;
  if (!sameCategories(categories, current.item_category)) request.categories = categories;
  return {
    request,
    error: Object.keys(request).length === 0 ? "请至少修改一项内容。" : null,
  };
}

function sameCategories(left: BoardCategory[], right: BoardCategory[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
