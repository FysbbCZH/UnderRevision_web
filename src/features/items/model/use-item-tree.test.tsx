import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "../../../test/server";
import { useItemTree } from "./use-item-tree";

const rootItem = {
  item_id: "root", item_name: "Root", item_source_type: "SNIP", item_source_id: "snip-root",
  item_category: ["ALL"], directory_id: null, board_id: "board-1", creator_id: "dev",
  status: "ACTIVE", revision: "rev-root", extra_params: null,
};

describe("useItemTree", () => {
  it("loads the root and clears a selection lost after refresh", async () => {
    let hasItem = true;
    server.use(http.get("*/api/v1/boards/:boardId/items/tree", () => HttpResponse.json({
      root_items: hasItem ? [rootItem] : [], directories: [],
    })));
    const { result } = renderHook(() => useItemTree("board-1"));
    await waitFor(() => expect(result.current.status).toBe("success"));
    act(() => result.current.selectItem("root"));
    hasItem = false;
    await act(() => result.current.refresh());
    expect(result.current.selectedItem).toBeNull();
    expect(result.current.selectionChanged).toBe(true);
  });

  it("preserves the last confirmed tree when a refresh fails", async () => {
    let fail = false;
    server.use(http.get("*/api/v1/boards/:boardId/items/tree", () =>
      fail ? HttpResponse.error() : HttpResponse.json({ root_items: [rootItem], directories: [] }),
    ));
    const { result } = renderHook(() => useItemTree("board-1"));
    await waitFor(() => expect(result.current.status).toBe("success"));
    fail = true;
    await act(() => result.current.refresh());
    expect(result.current.status).toBe("failure");
    expect(result.current.tree.root_items).toHaveLength(1);
  });
});
