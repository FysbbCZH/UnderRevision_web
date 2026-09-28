import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "../../../test/server";
import { DirectoryWorkspace } from "./DirectoryWorkspace";

const baseDirectory = {
  dir_id: "dir-1",
  dir_name: "References",
  parent_id: null,
  board_id: "board-1",
  creator_id: "dev123456",
};

describe("DirectoryWorkspace", () => {
  it("creates the first top-level directory and selects it after refresh", async () => {
    let directories: unknown[] = [];
    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json({ directories }),
      ),
      http.post("*/api/v1/boards/:boardId/directories", async ({ request }) => {
        expect(await request.json()).toEqual({
          dir_name: "References",
          parent_id: null,
        });
        directories = [{ ...baseDirectory, children: [] }];
        return HttpResponse.json(baseDirectory, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    render(<DirectoryWorkspace boardId="board-1" />);

    await user.click(await screen.findByRole("button", { name: "创建第一个目录" }));
    await user.type(screen.getByLabelText("目录名称"), "  References  ");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "创建目录" }),
    );

    expect(await screen.findByText("已创建目录“References”。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建子目录" })).toBeInTheDocument();
  });

  it("keeps expand and select separate and excludes descendants from move targets", async () => {
    const child = {
      ...baseDirectory,
      dir_id: "child",
      dir_name: "Child",
      parent_id: "dir-1",
      children: [],
    };
    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json({
          directories: [
            { ...baseDirectory, children: [child] },
            {
              ...baseDirectory,
              dir_id: "sibling",
              dir_name: "Sibling",
              children: [],
            },
          ],
        }),
      ),
    );
    const user = userEvent.setup();
    render(<DirectoryWorkspace boardId="board-1" />);

    await user.click(await screen.findByRole("button", { name: "展开目录 References" }));
    expect(screen.getByText("请先从目录树选择一个目录，再进行创建子目录、重命名、移动或删除。")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /^References\s*1 个子目录$/ }),
    );
    await user.click(screen.getByRole("button", { name: "移动" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("option", { name: "Board 顶层" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Sibling" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: "Child" })).not.toBeInTheDocument();
  });

  it("keeps the create form open when the backend reports a name conflict", async () => {
    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json({ directories: [] }),
      ),
      http.post("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json(
          {
            error: {
              code: "DIRECTORY_NAME_CONFLICT",
              message: "同一位置已存在同名目录。",
            },
          },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<DirectoryWorkspace boardId="board-1" />);

    await user.click(await screen.findByRole("button", { name: "创建第一个目录" }));
    await user.type(screen.getByLabelText("目录名称"), "References");
    await user.click(screen.getByRole("button", { name: "创建目录" }));

    expect(await screen.findByText("同一位置已存在同名目录。")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("notifies the Board coordinator after a confirmed recursive delete", async () => {
    let directories: unknown[] = [{ ...baseDirectory, children: [] }];
    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json({ directories }),
      ),
      http.delete("*/api/v1/boards/:boardId/directories/:directoryId", () => {
        directories = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const onDirectoryDeleted = vi.fn();
    const user = userEvent.setup();
    render(<DirectoryWorkspace boardId="board-1" onDirectoryDeleted={onDirectoryDeleted} />);

    await user.click(await screen.findByRole("button", { name: /^References$/ }));
    await user.click(screen.getByRole("button", { name: "删除目录" }));
    expect(screen.getByText(/其中 Item 都会被永久删除/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认删除目录" }));

    expect(onDirectoryDeleted).toHaveBeenCalledTimes(1);
  });
});
