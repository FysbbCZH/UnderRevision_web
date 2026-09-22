import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "../../../test/server";
import {
  useDirectoryMutations,
  useDirectoryTree,
} from "./use-directory-tree";

const directory = {
  dir_id: "dir-1",
  dir_name: "References",
  parent_id: null,
  board_id: "board-1",
  creator_id: "dev123456",
  children: [],
};

function installTreeHandler(directories = [directory]) {
  server.use(
    http.get("*/api/v1/boards/:boardId/directories", () =>
      HttpResponse.json({ directories }),
    ),
  );
}

describe("useDirectoryTree", () => {
  it("loads the tree and clears a selection removed by refresh", async () => {
    let directories = [directory];
    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () =>
        HttpResponse.json({ directories }),
      ),
    );
    const { result } = renderHook(() => useDirectoryTree("board-1"));
    await waitFor(() => expect(result.current.status).toBe("success"));

    act(() => result.current.selectDirectory("dir-1"));
    expect(result.current.selectedDirectory?.dir_name).toBe("References");

    directories = [];
    await act(async () => void (await result.current.refresh()));
    expect(result.current.selectedDirectory).toBeNull();
    expect(result.current.selectionChanged).toBe(true);
  });

  it("keeps the last confirmed tree when refresh fails", async () => {
    installTreeHandler();
    const { result } = renderHook(() => useDirectoryTree("board-1"));
    await waitFor(() => expect(result.current.status).toBe("success"));

    server.use(
      http.get("*/api/v1/boards/:boardId/directories", () => HttpResponse.error()),
    );
    await act(async () => void (await result.current.refresh()));

    expect(result.current.status).toBe("failure");
    expect(result.current.directories).toEqual([directory]);
  });
});

describe("useDirectoryMutations", () => {
  it("reconciles an unknown delete when the directory becomes 404", async () => {
    installTreeHandler([]);
    server.use(
      http.delete(
        "*/api/v1/boards/:boardId/directories/:directoryId",
        () => HttpResponse.error(),
      ),
      http.get(
        "*/api/v1/boards/:boardId/directories/:directoryId",
        () =>
          HttpResponse.json(
            {
              error: {
                code: "DIRECTORY_NOT_FOUND",
                message: "目录不存在。",
              },
            },
            { status: 404 },
          ),
      ),
    );

    const { result } = renderHook(() => {
      const tree = useDirectoryTree("board-1");
      const mutations = useDirectoryMutations(
        "board-1",
        tree.refresh,
        tree.selectDirectory,
      );
      return { tree, ...mutations };
    });
    await waitFor(() => expect(result.current.tree.status).toBe("success"));

    await act(async () => {
      await result.current.remove("dir-1", "References");
    });
    expect(result.current.mutation.status).toBe("result_unknown");

    await act(async () => void (await result.current.reconcileUnknown()));
    expect(result.current.mutation.status).toBe("success");
    expect(result.current.mutation.message).toBe("服务端已确认该目录不存在。");
  });
});
