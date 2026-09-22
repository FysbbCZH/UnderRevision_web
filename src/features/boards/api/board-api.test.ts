import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "../../../test/server";
import { BoardApiError } from "./errors";
import {
  createBoard,
  deleteBoard,
  listBoards,
  updateBoardName,
} from "./board-api";

const board = {
  board_id: "board-1",
  board_name: "Revision Study",
  creator_id: "dev123456",
};

describe("Board API", () => {
  it("keeps the server order when listing boards", async () => {
    const secondBoard = { ...board, board_id: "board-2", board_name: "Second" };
    server.use(
      http.get("*/api/v1/boards", () =>
        HttpResponse.json({ items: [secondBoard, board], total: 2 }),
      ),
    );

    await expect(listBoards()).resolves.toEqual({
      items: [secondBoard, board],
      total: 2,
    });
  });

  it("rejects a successful response that violates the contract", async () => {
    server.use(
      http.get("*/api/v1/boards", () =>
        HttpResponse.json({ items: [{ board_id: "incomplete" }], total: 1 }),
      ),
    );

    await expect(listBoards()).rejects.toMatchObject({
      kind: "contract",
    } satisfies Partial<BoardApiError>);
  });

  it("drops undeclared root directory data from a transitional response", async () => {
    server.use(
      http.get("*/api/v1/boards", () =>
        HttpResponse.json({
          items: [{ ...board, root_directory_id: "internal-root" }],
          total: 1,
        }),
      ),
    );

    const result = await listBoards();

    expect(result.items[0]).toEqual(board);
    expect(result.items[0]).not.toHaveProperty("root_directory_id");
  });

  it("keeps the backend message for a business error", async () => {
    server.use(
      http.post("*/api/v1/boards", () =>
        HttpResponse.json(
          {
            error: {
              code: "INVALID_BOARD_NAME",
              message: "Board 名称不合法。",
            },
          },
          { status: 422 },
        ),
      ),
    );

    await expect(createBoard({ board_name: "x" })).rejects.toMatchObject({
      kind: "business",
      status: 422,
      code: "INVALID_BOARD_NAME",
      message: "Board 名称不合法。",
    } satisfies Partial<BoardApiError>);
  });

  it("marks an interrupted mutation as result unknown without retrying", async () => {
    let requests = 0;
    server.use(
      http.patch("*/api/v1/boards/:boardId", () => {
        requests += 1;
        return HttpResponse.error();
      }),
    );

    await expect(
      updateBoardName("board-1", { board_name: "Changed" }),
    ).rejects.toMatchObject({
      kind: "result_unknown",
    } satisfies Partial<BoardApiError>);
    expect(requests).toBe(1);
  });

  it("accepts delete only when the backend returns 204", async () => {
    server.use(
      http.delete(
        "*/api/v1/boards/:boardId",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteBoard("board-1")).resolves.toBeUndefined();
  });
});
