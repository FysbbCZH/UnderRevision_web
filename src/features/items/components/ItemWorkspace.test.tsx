import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "../../../test/server";
import { ItemWorkspace } from "./ItemWorkspace";

const item = {
  item_id: "item-1", item_name: "Notes", item_source_type: "SNIP", item_source_id: "snip-1",
  item_category: ["ALL"], directory_id: null, board_id: "board-1", creator_id: "dev",
  status: "ACTIVE", revision: "rev-1", extra_params: null,
};

describe("ItemWorkspace", () => {
  it("defaults to Board top level and edits only changed fields", async () => {
    let patchBody: unknown;
    server.use(
      http.get("*/api/v1/boards/:boardId/items/tree", () => HttpResponse.json({ root_items: [item], directories: [] })),
      http.patch("*/api/v1/boards/:boardId/items/:itemId", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ ...item, item_name: "Revised", revision: "rev-2" }, { headers: { ETag: '"rev-2"' } });
      }),
    );
    const user = userEvent.setup();
    render(<ItemWorkspace boardId="board-1" />);
    expect(await screen.findByRole("button", { name: "Board 顶层" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /Notes/ }));
    await user.click(screen.getByRole("button", { name: "编辑信息" }));
    const name = screen.getByLabelText("Item 名称");
    await user.clear(name);
    await user.type(name, "Revised");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "保存修改" }));
    expect(await screen.findByText("Item 信息已更新。")).toBeInTheDocument();
    expect(patchBody).toEqual({ item_name: "Revised" });
  });

  it("keeps ALL exclusive in the upload form", async () => {
    server.use(http.get("*/api/v1/boards/:boardId/items/tree", () => HttpResponse.json({ root_items: [], directories: [] })));
    const user = userEvent.setup();
    render(<ItemWorkspace boardId="board-1" />);
    await user.click(await screen.findByRole("button", { name: "上传文件" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("本地文件")).toHaveAttribute(
      "accept",
      "text/*,.txt,.md,.csv,.json,.yaml,.yml,.pdf,.doc,.docx",
    );
    const all = within(dialog).getByRole("checkbox", { name: "ALL" });
    const data = within(dialog).getByRole("checkbox", { name: "DATA" });
    expect(all).toBeChecked();
    await user.click(data);
    expect(data).toBeChecked();
    expect(all).not.toBeChecked();
  });
});
