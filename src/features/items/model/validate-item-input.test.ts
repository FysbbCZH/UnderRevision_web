import { describe, expect, it } from "vitest";

import type { ItemResponse } from "../api/types";
import { buildItemUpdate, normalizeCategories, normalizeItemName } from "./validate-item-input";

const item: ItemResponse = {
  item_id: "item-1", item_name: "Notes", item_source_type: "SNIP", item_source_id: "snip-1",
  item_category: ["ALL"], directory_id: null, board_id: "board-1", creator_id: "dev",
  status: "ACTIVE", revision: "rev-1", extra_params: null,
};

describe("Item input rules", () => {
  it("trims names and enforces the Unicode length boundary", () => {
    expect(normalizeItemName("  资料  ")).toEqual({ value: "资料", error: null });
    expect(normalizeItemName("😀".repeat(256)).error).not.toBeNull();
  });

  it("keeps ALL mutually exclusive and defaults empty selection", () => {
    expect(normalizeCategories([])).toEqual(["ALL"]);
    expect(normalizeCategories(["DATA", "ALL", "DATA"])).toEqual(["ALL"]);
    expect(normalizeCategories(["DATA", "REFERENCE", "DATA"])).toEqual(["DATA", "REFERENCE"]);
  });

  it("builds only changed fields", () => {
    expect(buildItemUpdate(item, {
      itemName: " Revised ", directoryId: "dir-1", categories: ["DATA", "REFERENCE"],
    })).toEqual({
      request: { item_name: "Revised", directory_id: "dir-1", categories: ["DATA", "REFERENCE"] },
      error: null,
    });
    expect(buildItemUpdate(item, {
      itemName: "Notes", directoryId: null, categories: ["ALL"],
    }).error).toBe("请至少修改一项内容。");
  });
});
