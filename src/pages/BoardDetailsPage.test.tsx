import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { server } from "../test/server";
import { BoardDetailsPage } from "./BoardDetailsPage";

const board = {
  board_id: "board-1",
  board_name: "Revision Study",
  creator_id: "dev123456",
  root_directory_id: "root-1",
};

function renderDetails() {
  return render(
    <MemoryRouter initialEntries={["/boards/board-1"]}>
      <Routes>
        <Route path="/boards/:boardId" element={<BoardDetailsPage />} />
        <Route path="/boards" element={<p>Board 列表页</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BoardDetailsPage", () => {
  it("renders read-only board metadata", async () => {
    server.use(
      http.get("*/api/v1/boards/:boardId", () => HttpResponse.json(board)),
    );

    renderDetails();

    expect(
      await screen.findByRole("heading", { name: "Revision Study" }),
    ).toBeInTheDocument();
    expect(screen.getByText("dev123456")).toBeInTheDocument();
    expect(screen.getByText("root-1")).toBeInTheDocument();
  });

  it("renames the board only after the backend confirms success", async () => {
    let currentBoard = board;
    let submittedBody: unknown;
    server.use(
      http.get("*/api/v1/boards/:boardId", () =>
        HttpResponse.json(currentBoard),
      ),
      http.patch("*/api/v1/boards/:boardId", async ({ request }) => {
        submittedBody = await request.json();
        currentBoard = { ...board, board_name: "Revised title" };
        return HttpResponse.json(currentBoard);
      }),
    );

    const user = userEvent.setup();
    renderDetails();
    await screen.findByRole("heading", { name: "Revision Study" });
    await user.click(screen.getByRole("button", { name: "重命名" }));
    const input = screen.getByLabelText("Board 名称");
    await user.clear(input);
    await user.type(input, "Revised title");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "保存新名称",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Revised title" }),
    ).toBeInTheDocument();
    expect(submittedBody).toEqual({ board_name: "Revised title" });
  });

  it("keeps the board when the backend rejects deleting a non-empty board", async () => {
    server.use(
      http.get("*/api/v1/boards/:boardId", () => HttpResponse.json(board)),
      http.delete("*/api/v1/boards/:boardId", () =>
        HttpResponse.json(
          {
            error: {
              code: "BOARD_NOT_EMPTY",
              message: "当前 Board 非空，不能删除。",
            },
          },
          { status: 409 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderDetails();
    await screen.findByRole("heading", { name: "Revision Study" });
    await user.click(screen.getByRole("button", { name: "删除 Board" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "确认删除",
      }),
    );

    expect(
      await screen.findByText("当前 Board 非空，不能删除。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Revision Study" }),
    ).toBeInTheDocument();
  });

  it("returns to the list only after a 204 delete response", async () => {
    server.use(
      http.get("*/api/v1/boards/:boardId", () => HttpResponse.json(board)),
      http.delete(
        "*/api/v1/boards/:boardId",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    const user = userEvent.setup();
    renderDetails();
    await screen.findByRole("heading", { name: "Revision Study" });
    await user.click(screen.getByRole("button", { name: "删除 Board" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "确认删除",
      }),
    );

    expect(await screen.findByText("Board 列表页")).toBeInTheDocument();
  });

  it("reconciles an unknown delete result when the detail becomes 404", async () => {
    let detailRequests = 0;
    server.use(
      http.get("*/api/v1/boards/:boardId", () => {
        detailRequests += 1;
        return detailRequests === 1
          ? HttpResponse.json(board)
          : HttpResponse.json(
              {
                error: {
                  code: "BOARD_NOT_FOUND",
                  message: "Board 不存在。",
                },
              },
              { status: 404 },
            );
      }),
      http.delete("*/api/v1/boards/:boardId", () => HttpResponse.error()),
    );

    const user = userEvent.setup();
    renderDetails();
    await screen.findByRole("heading", { name: "Revision Study" });
    await user.click(screen.getByRole("button", { name: "删除 Board" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "确认删除",
      }),
    );

    expect(await screen.findByText("删除结果暂时未知")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "重新查询详情" }));
    expect(await screen.findByText("Board 列表页")).toBeInTheDocument();
  });
});
