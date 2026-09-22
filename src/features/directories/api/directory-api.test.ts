import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "../../../shared/api/api-error";
import { server } from "../../../test/server";
import {
  createDirectory,
  deleteDirectory,
  getDirectory,
  listDirectoryTree,
  updateDirectory,
} from "./directory-api";

const directory = {
  dir_id: "dir-1",
  dir_name: "References",
  parent_id: null,
  board_id: "board-1",
  creator_id: "dev123456",
};

describe("Directory API", () => {
  it("keeps server order and validates the complete tree", async () => {
    const child = {
      ...directory,
      dir_id: "dir-child",
      dir_name: "Articles",
      parent_id: "dir-1",
      children: [],
    };
    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json({
          directories: [
            { ...directory, children: [child] },
            { ...directory, dir_id: "dir-2", dir_name: "Data", children: [] },
          ],
        }),
      ),
    );

    const result = await listDirectoryTree("board-1");

    expect(result.directories.map((item) => item.dir_id)).toEqual([
      "dir-1",
      "dir-2",
    ]);
    expect(result.directories[0].children[0]).toEqual(child);
  });

  it("rejects duplicate IDs anywhere in the tree", async () => {
    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json({
          directories: [
            {
              ...directory,
              children: [
                { ...directory, parent_id: "dir-1", children: [] },
              ],
            },
          ],
        }),
      ),
    );

    await expect(listDirectoryTree("board-1")).rejects.toMatchObject({
      kind: "contract",
    } satisfies Partial<ApiError>);
  });

  it("rejects a directory response from another Board", async () => {
    server.use(
      http.get("*/api/v1/boards/:boardId/directories/:directoryId", () =>
        HttpResponse.json({ ...directory, board_id: "board-2" }),
      ),
    );

    await expect(getDirectory("board-1", "dir-1")).rejects.toMatchObject({
      kind: "contract",
    } satisfies Partial<ApiError>);
  });

  it("creates a top-level directory with an explicit null parent", async () => {
    let submittedBody: unknown;
    server.use(
      http.post(
        "*/api/v1/boards/:boardId/directories",
        async ({ request }) => {
          submittedBody = await request.json();
          return HttpResponse.json(directory, { status: 201 });
        },
      ),
    );

    await expect(
      createDirectory("board-1", {
        dir_name: "References",
        parent_id: null,
      }),
    ).resolves.toEqual(directory);
    expect(submittedBody).toEqual({
      dir_name: "References",
      parent_id: null,
    });
  });

  it("marks an interrupted update as result unknown without retrying", async () => {
    let requests = 0;
    server.use(
      http.patch(
        "*/api/v1/boards/:boardId/directories/:directoryId",
        () => {
          requests += 1;
          return HttpResponse.error();
        },
      ),
    );

    await expect(
      updateDirectory("board-1", "dir-1", { dir_name: "Changed" }),
    ).rejects.toMatchObject({ kind: "result_unknown" } satisfies Partial<ApiError>);
    expect(requests).toBe(1);
  });

  it("accepts deletion only after a 204 response", async () => {
    server.use(
      http.delete(
        "*/api/v1/boards/:boardId/directories/:directoryId",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteDirectory("board-1", "dir-1")).resolves.toBeUndefined();
  });
});
