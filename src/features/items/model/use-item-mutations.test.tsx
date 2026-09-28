import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "../../../test/server";
import type { ItemResponse } from "../api/types";
import { useItemMutations } from "./use-item-mutations";

const item: ItemResponse = {
  item_id: "item-1", item_name: "Notes", item_source_type: "SNIP", item_source_id: "snip-1",
  item_category: ["ALL"], directory_id: null, board_id: "board-1", creator_id: "dev",
  status: "ACTIVE", revision: "rev-1", extra_params: null,
};

describe("useItemMutations", () => {
  it("refreshes latest data after a revision conflict", async () => {
    server.use(http.patch("*/api/v1/boards/:boardId/items/:itemId", () => HttpResponse.json({
      error: { code: "ITEM_REVISION_CONFLICT", message: "Item 已被修改。" },
    }, { status: 409 })));
    const refresh = vi.fn().mockResolvedValue({ status: "success", tree: { root_items: [item], directories: [] } });
    const { result } = renderHook(() => useItemMutations("board-1", refresh));
    await act(() => result.current.edit(item, { item_name: "Changed" }));
    expect(result.current.state.status).toBe("failure");
    expect(refresh).toHaveBeenCalledWith({ selectItemId: "item-1" });
  });

  it("confirms an unknown delete after single Item returns 404", async () => {
    let deleting = true;
    server.use(
      http.delete("*/api/v1/boards/:boardId/items/:itemId", () => {
        if (deleting) {
          deleting = false;
          return HttpResponse.error();
        }
        return new HttpResponse(null, { status: 204 });
      }),
      http.get("*/api/v1/boards/:boardId/items/:itemId", () => HttpResponse.json({
        error: { code: "ITEM_NOT_FOUND", message: "Item 不存在。" },
      }, { status: 404 })),
    );
    const refresh = vi.fn().mockResolvedValue({ status: "success", tree: { root_items: [], directories: [] } });
    const { result } = renderHook(() => useItemMutations("board-1", refresh));
    await act(() => result.current.remove(item));
    expect(result.current.state.status).toBe("result_unknown");
    await act(() => result.current.reconcileUnknown());
    await waitFor(() => expect(result.current.state.status).toBe("success"));
    expect(result.current.state.message).toContain("不存在");
  });
});
