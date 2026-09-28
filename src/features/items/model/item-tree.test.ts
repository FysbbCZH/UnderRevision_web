import { describe, expect, it } from "vitest";

import type { ItemDirectoryTreeResponse, ItemResponse } from "../api/types";
import { buildLocationOptions, countItems, findItem, itemsInDirectory } from "./item-tree";

const rootItem = createItem("root", null);
const nestedItem = createItem("nested", "child");
const tree: ItemDirectoryTreeResponse = {
  root_items: [rootItem],
  directories: [{
    dir_id: "parent", dir_name: "Parent", parent_id: null,
    board_id: "board-1", creator_id: "dev", items: [],
    children: [{
      dir_id: "child", dir_name: "Child", parent_id: "parent",
      board_id: "board-1", creator_id: "dev", items: [nestedItem], children: [],
    }],
  }],
};

describe("Item tree model", () => {
  it("counts and finds root and nested Items", () => {
    expect(countItems(tree)).toBe(2);
    expect(findItem(tree, "nested")).toEqual(nestedItem);
  });

  it("returns only direct Items and preserves server order", () => {
    expect(itemsInDirectory(tree, null)).toEqual([rootItem]);
    expect(itemsInDirectory(tree, "parent")).toEqual([]);
    expect(itemsInDirectory(tree, "child")).toEqual([nestedItem]);
  });

  it("builds explicit top-level and depth-aware directory options", () => {
    expect(buildLocationOptions(tree.directories)).toEqual([
      { id: null, label: "Board 顶层", depth: 0 },
      { id: "parent", label: "Parent", depth: 0 },
      { id: "child", label: "Child", depth: 1 },
    ]);
  });
});

function createItem(id: string, directoryId: string | null): ItemResponse {
  return {
    item_id: id, item_name: id, item_source_type: "SNIP", item_source_id: `snip-${id}`,
    item_category: ["ALL"], directory_id: directoryId, board_id: "board-1",
    creator_id: "dev", status: "ACTIVE", revision: `rev-${id}`, extra_params: null,
  };
}
