import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { listItemTree } from "../api/item-api";
import type {
  ItemDirectoryTreeResponse,
  QueryStatus,
} from "../api/types";
import {
  findItem,
  findItemDirectory,
  itemsInDirectory,
  reconcileExpandedDirectoryIds,
} from "./item-tree";

const EMPTY_TREE: ItemDirectoryTreeResponse = { root_items: [], directories: [] };

export type ItemTreeRefreshResult =
  | { status: "success"; tree: ItemDirectoryTreeResponse }
  | { status: "failure"; error: unknown }
  | { status: "aborted" };

interface RefreshOptions {
  selectDirectoryId?: string | null;
  selectItemId?: string | null;
}

/** 管理最后确认的 Item 树，并阻止旧 Board 响应覆盖当前页面。 */
export function useItemTree(boardId: string, invalidationVersion = 0) {
  const [tree, setTree] = useState<ItemDirectoryTreeResponse>(EMPTY_TREE);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<unknown>(null);
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectionChanged, setSelectionChanged] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const activeController = useRef<AbortController | null>(null);
  const directoryRef = useRef<string | null>(null);
  const itemRef = useRef<string | null>(null);

  const selectDirectory = useCallback((directoryId: string | null) => {
    directoryRef.current = directoryId;
    itemRef.current = null;
    setSelectedDirectoryId(directoryId);
    setSelectedItemId(null);
    setSelectionChanged(false);
  }, []);

  const selectItem = useCallback((itemId: string | null, directoryId?: string | null) => {
    itemRef.current = itemId;
    setSelectedItemId(itemId);
    if (directoryId !== undefined) {
      directoryRef.current = directoryId;
      setSelectedDirectoryId(directoryId);
    }
    setSelectionChanged(false);
  }, []);

  const refresh = useCallback(async (
    options: RefreshOptions = {},
  ): Promise<ItemTreeRefreshResult> => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setStatus("loading");
    setError(null);
    try {
      const response = await listItemTree(boardId, controller.signal);
      if (controller.signal.aborted) return { status: "aborted" };
      const desiredDirectory = options.selectDirectoryId === undefined
        ? directoryRef.current
        : options.selectDirectoryId;
      const nextDirectory = desiredDirectory === null || findItemDirectory(response.directories, desiredDirectory)
        ? desiredDirectory
        : null;
      const desiredItem = options.selectItemId === undefined ? itemRef.current : options.selectItemId;
      const selectedItem = findItem(response, desiredItem);
      const nextItemId = selectedItem?.item_id ?? null;
      const nextItemDirectory = selectedItem ? selectedItem.directory_id : nextDirectory;
      const lostSelection =
        (desiredDirectory !== null && nextDirectory === null) ||
        (desiredItem !== null && nextItemId === null);
      directoryRef.current = nextItemDirectory;
      itemRef.current = nextItemId;
      setTree(response);
      setSelectedDirectoryId(nextItemDirectory);
      setSelectedItemId(nextItemId);
      setSelectionChanged(lostSelection);
      setExpandedIds((current) => reconcileExpandedDirectoryIds(response.directories, current));
      setStatus("success");
      return { status: "success", tree: response };
    } catch (requestError) {
      if (controller.signal.aborted) return { status: "aborted" };
      setError(requestError);
      setStatus("failure");
      return { status: "failure", error: requestError };
    }
  }, [boardId]);

  useEffect(() => {
    directoryRef.current = null;
    itemRef.current = null;
    const initialLoad = window.setTimeout(() => {
      setTree(EMPTY_TREE);
      setSelectedDirectoryId(null);
      setSelectedItemId(null);
      setExpandedIds(new Set());
      void refresh();
    }, 0);
    return () => {
      window.clearTimeout(initialLoad);
      activeController.current?.abort();
    };
  }, [boardId, invalidationVersion, refresh]);

  const toggleExpanded = useCallback((directoryId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(directoryId)) next.delete(directoryId);
      else next.add(directoryId);
      return next;
    });
  }, []);

  const selectedItem = useMemo(() => findItem(tree, selectedItemId), [tree, selectedItemId]);
  const currentItems = useMemo(
    () => itemsInDirectory(tree, selectedDirectoryId),
    [tree, selectedDirectoryId],
  );

  return {
    tree,
    status,
    error,
    selectedDirectoryId,
    selectedItemId,
    selectedItem,
    currentItems,
    selectionChanged,
    expandedIds,
    refresh,
    selectDirectory,
    selectItem,
    toggleExpanded,
  };
}
