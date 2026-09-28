import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError } from "../../../shared/api/api-error";
import {
  createDirectory,
  deleteDirectory,
  getDirectory,
  listDirectoryTree,
  updateDirectory,
} from "../api/directory-api";
import type {
  DirectoryTreeNode,
  MutationStatus,
  QueryStatus,
} from "../api/types";
import {
  findDirectory,
  reconcileExpandedIds,
} from "./directory-tree";

export type DirectoryOperation = "create" | "rename" | "move" | "delete";

export type DirectoryRefreshResult =
  | { status: "success"; directories: DirectoryTreeNode[] }
  | { status: "failure"; error: unknown }
  | { status: "aborted" };

export interface DirectoryMutationState {
  operation: DirectoryOperation | null;
  status: MutationStatus;
  error: unknown;
  message: string | null;
  targetId: string | null;
  treeMayBeStale: boolean;
}

interface RefreshOptions {
  selectId?: string | null;
}

/** 管理已确认目录树、请求竞态以及选择和展开状态。 */
export function useDirectoryTree(boardId: string) {
  const [directories, setDirectories] = useState<DirectoryTreeNode[]>([]);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<unknown>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectionChanged, setSelectionChanged] = useState(false);
  const activeController = useRef<AbortController | null>(null);
  const selectedIdRef = useRef<string | null>(null);

  const selectDirectory = useCallback((directoryId: string | null) => {
    selectedIdRef.current = directoryId;
    setSelectedId(directoryId);
    setSelectionChanged(false);
  }, []);

  const refresh = useCallback(
    async (options: RefreshOptions = {}): Promise<DirectoryRefreshResult> => {
      activeController.current?.abort();
      const controller = new AbortController();
      activeController.current = controller;
      setStatus("loading");
      setError(null);

      try {
        const response = await listDirectoryTree(boardId, controller.signal);
        if (controller.signal.aborted) {
          return { status: "aborted" };
        }

        const desiredId =
          options.selectId === undefined ? selectedIdRef.current : options.selectId;
        const nextSelectedId = findDirectory(response.directories, desiredId)
          ? desiredId
          : null;
        const lostSelection = desiredId !== null && nextSelectedId === null;
        selectedIdRef.current = nextSelectedId;
        setDirectories(response.directories);
        setSelectedId(nextSelectedId);
        setSelectionChanged(lostSelection);
        setExpandedIds((current) =>
          reconcileExpandedIds(response.directories, current),
        );
        setStatus("success");
        return { status: "success", directories: response.directories };
      } catch (requestError) {
        if (controller.signal.aborted) {
          return { status: "aborted" };
        }
        setError(requestError);
        setStatus("failure");
        return { status: "failure", error: requestError };
      }
    },
    [boardId],
  );

  const toggleExpanded = useCallback((directoryId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(directoryId)) {
        next.delete(directoryId);
      } else {
        next.add(directoryId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      selectDirectory(null);
      setExpandedIds(new Set());
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(initialLoad);
      activeController.current?.abort();
    };
  }, [boardId, refresh, selectDirectory]);

  const selectedDirectory = useMemo(
    () => findDirectory(directories, selectedId),
    [directories, selectedId],
  );

  return {
    directories,
    status,
    error,
    selectedId,
    selectedDirectory,
    expandedIds,
    selectionChanged,
    refresh,
    selectDirectory,
    toggleExpanded,
  };
}

/** 管理目录变更，并把网络中断保留为可核对的结果未知状态。 */
export function useDirectoryMutations(
  boardId: string,
  refresh: (options?: RefreshOptions) => Promise<DirectoryRefreshResult>,
  selectDirectory: (directoryId: string | null) => void,
  onConfirmedDelete?: () => void,
) {
  const [state, setState] = useState<DirectoryMutationState>(EMPTY_MUTATION_STATE);

  const run = useCallback(
    async (
      operation: DirectoryOperation,
      targetId: string | null,
      successMessage: string,
      request: () => Promise<{ selectId: string | null }>,
    ) => {
      setState({
        operation,
        status: "submitting",
        error: null,
        message: null,
        targetId,
        treeMayBeStale: false,
      });
      try {
        const result = await request();
        selectDirectory(result.selectId);
        const refreshed = await refresh({ selectId: result.selectId });
        setState({
          operation,
          status: "success",
          error: null,
          message: successMessage,
          targetId,
          treeMayBeStale: refreshed.status !== "success",
        });
        return "success" as const;
      } catch (requestError) {
        const isUnknown =
          requestError instanceof ApiError && requestError.kind === "result_unknown";
        setState({
          operation,
          status: isUnknown ? "result_unknown" : "failure",
          error: requestError,
          message: null,
          targetId,
          treeMayBeStale: false,
        });
        return isUnknown ? ("result_unknown" as const) : ("failure" as const);
      }
    },
    [refresh, selectDirectory],
  );

  const create = useCallback(
    (name: string, parentId: string | null) =>
      run("create", null, `已创建目录“${name}”。`, async () => {
        const created = await createDirectory(boardId, {
          dir_name: name,
          parent_id: parentId,
        });
        return { selectId: created.dir_id };
      }),
    [boardId, run],
  );

  const rename = useCallback(
    (directoryId: string, name: string) =>
      run("rename", directoryId, `已将目录重命名为“${name}”。`, async () => {
        const updated = await updateDirectory(boardId, directoryId, {
          dir_name: name,
        });
        return { selectId: updated.dir_id };
      }),
    [boardId, run],
  );

  const move = useCallback(
    (directoryId: string, parentId: string | null) =>
      run("move", directoryId, "目录位置已更新。", async () => {
        const updated = await updateDirectory(boardId, directoryId, { parent_id: parentId });
        return { selectId: updated.dir_id };
      }),
    [boardId, run],
  );

  const remove = useCallback(
    async (directoryId: string, directoryName: string) => {
      const result = await run("delete", directoryId, `已删除目录“${directoryName}”。`, async () => {
        await deleteDirectory(boardId, directoryId);
        return { selectId: null };
      });
      if (result === "success") onConfirmedDelete?.();
      return result;
    },
    [boardId, onConfirmedDelete, run],
  );

  const reconcileUnknown = useCallback(async () => {
    if (state.status !== "result_unknown") {
      return;
    }
    if (state.operation === "delete" && state.targetId) {
      await reconcileUnknownDelete(
        boardId,
        state.targetId,
        refresh,
        selectDirectory,
        setState,
        onConfirmedDelete,
      );
      return;
    }

    const refreshed = await refresh();
    if (refreshed.status === "success") {
      setState({
        ...EMPTY_MUTATION_STATE,
        status: "success",
        message: "已重新读取服务端目录树，请按当前内容确认操作结果。",
      });
    }
  }, [boardId, onConfirmedDelete, refresh, selectDirectory, state]);

  const resetMutation = useCallback(() => setState(EMPTY_MUTATION_STATE), []);

  return { mutation: state, create, rename, move, remove, reconcileUnknown, resetMutation };
}

const EMPTY_MUTATION_STATE: DirectoryMutationState = {
  operation: null,
  status: "idle",
  error: null,
  message: null,
  targetId: null,
  treeMayBeStale: false,
};

async function reconcileUnknownDelete(
  boardId: string,
  directoryId: string,
  refresh: (options?: RefreshOptions) => Promise<DirectoryRefreshResult>,
  selectDirectory: (directoryId: string | null) => void,
  setState: (state: DirectoryMutationState) => void,
  onConfirmedDelete?: () => void,
): Promise<void> {
  try {
    await getDirectory(boardId, directoryId);
    setState({
      ...EMPTY_MUTATION_STATE,
      status: "success",
      message: "目录仍然存在，已保留当前数据。",
    });
  } catch (error) {
    const deleted =
      error instanceof ApiError &&
      error.status === 404 &&
      error.code === "DIRECTORY_NOT_FOUND";
    if (!deleted) {
      setState({
        operation: "delete",
        status: "result_unknown",
        error,
        message: null,
        targetId: directoryId,
        treeMayBeStale: false,
      });
      return;
    }

    selectDirectory(null);
    const refreshed = await refresh({ selectId: null });
    setState({
      ...EMPTY_MUTATION_STATE,
      status: "success",
      message: "服务端已确认该目录不存在。",
      treeMayBeStale: refreshed.status !== "success",
    });
    onConfirmedDelete?.();
  }
}
