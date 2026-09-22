import { useCallback, useEffect, useRef, useState } from "react";

import { listBoards } from "../api/board-api";
import type { BoardListResponse, QueryStatus } from "../api/types";

interface BoardListState {
  data: BoardListResponse | null;
  status: QueryStatus;
  error: unknown;
  refresh: () => Promise<boolean>;
}

/**
 * 管理 Board 列表查询，并在新查询开始时取消已过期的旧请求。
 */
export function useBoardList(): BoardListState {
  const [data, setData] = useState<BoardListResponse | null>(null);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const [error, setError] = useState<unknown>(null);
  const activeController = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setStatus("loading");
    setError(null);

    try {
      const response = await listBoards(controller.signal);
      if (controller.signal.aborted) {
        return false;
      }

      setData(response);
      setStatus("success");
      return true;
    } catch (requestError) {
      if (controller.signal.aborted) {
        return false;
      }

      setError(requestError);
      setStatus("failure");
      return false;
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(initialLoad);
      activeController.current?.abort();
    };
  }, [refresh]);

  return { data, status, error, refresh };
}
