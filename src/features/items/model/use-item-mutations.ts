import { useCallback, useRef, useState } from "react";

import { ApiError } from "../../../shared/api/api-error";
import {
  createFileItem,
  deleteItem,
  downloadItem,
  getItem,
  updateItem,
} from "../api/item-api";
import type {
  BoardCategory,
  ItemResponse,
  MutationStatus,
  UpdateItemRequest,
} from "../api/types";
import { calculateFileFingerprint } from "./file-fingerprint";
import type { ItemTreeRefreshResult } from "./use-item-tree";

export type ItemOperation = "upload" | "edit" | "download" | "delete";

export interface ItemMutationState {
  operation: ItemOperation | null;
  status: MutationStatus;
  error: unknown;
  message: string | null;
  targetId: string | null;
  treeMayBeStale: boolean;
}

interface UploadDraft {
  file: File;
  itemName: string;
  directoryId: string | null;
  categories: BoardCategory[];
}

type Refresh = (options?: {
  selectDirectoryId?: string | null;
  selectItemId?: string | null;
}) => Promise<ItemTreeRefreshResult>;

/** 编排 Item 变更；所有成功结果都在服务端确认后再刷新树。 */
export function useItemMutations(boardId: string, refresh: Refresh) {
  const [state, setState] = useState<ItemMutationState>(EMPTY_STATE);
  const activeController = useRef<AbortController | null>(null);

  const upload = useCallback(async (draft: UploadDraft) => {
    const controller = new AbortController();
    let requestStarted = false;
    activeController.current = controller;
    setState(nextState("upload", "hashing"));
    try {
      const fingerPrint = await calculateFileFingerprint(draft.file, controller.signal);
      setState(nextState("upload", "submitting"));
      requestStarted = true;
      const created = await createFileItem(boardId, { ...draft, fingerPrint }, controller.signal);
      const refreshed = await refresh({
        selectDirectoryId: created.directory_id,
        selectItemId: created.item_id,
      });
      setState(successState("upload", `已创建 Item“${created.item_name}”。`, created.item_id, refreshed));
      return { status: "success" as const, item: created };
    } catch (error) {
      if (!requestStarted && error instanceof DOMException && error.name === "AbortError") {
        setState(EMPTY_STATE);
        return { status: "cancelled" as const };
      }
      const unknown = error instanceof ApiError && error.kind === "result_unknown";
      if (unknown) await refresh();
      setState(failureState("upload", error, unknown));
      return { status: unknown ? "result_unknown" as const : "failure" as const };
    } finally {
      activeController.current = null;
    }
  }, [boardId, refresh]);

  const edit = useCallback(async (item: ItemResponse, request: UpdateItemRequest) => {
    setState(nextState("edit", "submitting", item.item_id));
    try {
      const updated = await updateItem(boardId, item.item_id, item.revision, request);
      const refreshed = await refresh({ selectItemId: item.item_id });
      setState(successState("edit", "Item 信息已更新。", item.item_id, refreshed));
      return { status: "success" as const, item: updated };
    } catch (error) {
      const unknown = error instanceof ApiError && error.kind === "result_unknown";
      if (unknown || isRevisionConflict(error)) await refresh({ selectItemId: item.item_id });
      setState(failureState("edit", error, unknown, item.item_id));
      return { status: unknown ? "result_unknown" as const : "failure" as const };
    }
  }, [boardId, refresh]);

  const remove = useCallback(async (item: ItemResponse) => {
    setState(nextState("delete", "submitting", item.item_id));
    try {
      await deleteItem(boardId, item.item_id, item.revision);
      const refreshed = await refresh({ selectItemId: null });
      setState(successState("delete", `已删除 Item“${item.item_name}”。`, item.item_id, refreshed));
      return "success" as const;
    } catch (error) {
      const unknown = error instanceof ApiError && error.kind === "result_unknown";
      if (isRevisionConflict(error)) await refresh({ selectItemId: item.item_id });
      setState(failureState("delete", error, unknown, item.item_id));
      return unknown ? "result_unknown" as const : "failure" as const;
    }
  }, [boardId, refresh]);

  const download = useCallback(async (item: ItemResponse) => {
    setState(nextState("download", "submitting", item.item_id));
    try {
      const result = await downloadItem(boardId, item.item_id);
      saveBlob(result.blob, result.fileName);
      setState({ ...successState("download", "下载已开始。", item.item_id), treeMayBeStale: false });
      return "success" as const;
    } catch (error) {
      setState(failureState("download", error, false, item.item_id));
      return "failure" as const;
    }
  }, [boardId]);

  const reconcileUnknown = useCallback(async () => {
    if (state.status !== "result_unknown") return;
    if (state.operation === "upload") {
      const refreshed = await refresh();
      if (refreshed.status === "success") {
        setState({
          ...EMPTY_STATE,
          status: "success",
          message: "已刷新 Item 树，但无法唯一确认本次上传结果，请检查后再决定是否重试。",
        });
      }
      return;
    }
    if (!state.targetId || !state.operation) return;
    await reconcileExistingItem(boardId, state.operation, state.targetId, refresh, setState);
  }, [boardId, refresh, state]);

  const cancelUpload = useCallback(() => activeController.current?.abort(), []);
  const resetMutation = useCallback(() => setState(EMPTY_STATE), []);
  return { state, upload, edit, remove, download, reconcileUnknown, cancelUpload, resetMutation };
}

const EMPTY_STATE: ItemMutationState = {
  operation: null, status: "idle", error: null, message: null,
  targetId: null, treeMayBeStale: false,
};

function nextState(operation: ItemOperation, status: MutationStatus, targetId: string | null = null): ItemMutationState {
  return { operation, status, error: null, message: null, targetId, treeMayBeStale: false };
}

function failureState(
  operation: ItemOperation,
  error: unknown,
  unknown: boolean,
  targetId: string | null = null,
): ItemMutationState {
  return { operation, status: unknown ? "result_unknown" : "failure", error, message: null, targetId, treeMayBeStale: false };
}

function successState(
  operation: ItemOperation,
  message: string,
  targetId: string | null,
  refresh?: ItemTreeRefreshResult,
): ItemMutationState {
  return { operation, status: "success", error: null, message, targetId, treeMayBeStale: refresh !== undefined && refresh.status !== "success" };
}

function isRevisionConflict(error: unknown): boolean {
  return error instanceof ApiError && error.code === "ITEM_REVISION_CONFLICT";
}

async function reconcileExistingItem(
  boardId: string,
  operation: ItemOperation,
  itemId: string,
  refresh: Refresh,
  setState: (state: ItemMutationState) => void,
): Promise<void> {
  try {
    await getItem(boardId, itemId);
    const refreshed = await refresh({ selectItemId: itemId });
    setState(successState(operation, "已读取服务端当前 Item，请按最新内容确认操作结果。", itemId, refreshed));
  } catch (error) {
    const deleted = error instanceof ApiError && error.status === 404 && error.code === "ITEM_NOT_FOUND";
    if (operation === "delete" && deleted) {
      const refreshed = await refresh({ selectItemId: null });
      setState(successState("delete", "服务端已确认该 Item 不存在。", itemId, refreshed));
      return;
    }
    setState(failureState(operation, error, true, itemId));
  }
}

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
