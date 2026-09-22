import { useCallback, useEffect, useRef, useState } from "react";

import { getBoard } from "../api/board-api";
import type { BoardResponse, QueryStatus } from "../api/types";

interface BoardDetailsState {
  data: BoardResponse | null;
  status: QueryStatus;
  error: unknown;
  refresh: () => Promise<BoardDetailsRefreshResult>;
  acceptConfirmedBoard: (board: BoardResponse) => void;
}

export type BoardDetailsRefreshResult =
  | { status: "success"; data: BoardResponse }
  | { status: "failure"; error: unknown }
  | { status: "aborted" };

/**
 * 管理单个 Board 详情，并阻止旧路由请求覆盖新 Board。
 */
export function useBoardDetails(boardId: string): BoardDetailsState {
  const [data, setData] = useState<BoardResponse | null>(null);
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
      const response = await getBoard(boardId, controller.signal);
      if (controller.signal.aborted) {
        return { status: "aborted" } as const;
      }

      setData(response);
      setStatus("success");
      return { status: "success", data: response } as const;
    } catch (requestError) {
      if (controller.signal.aborted) {
        return { status: "aborted" } as const;
      }

      setError(requestError);
      setStatus("failure");
      return { status: "failure", error: requestError } as const;
    }
  }, [boardId]);

  const acceptConfirmedBoard = useCallback((board: BoardResponse) => {
    setData(board);
    setStatus("success");
    setError(null);
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

  return { data, status, error, refresh, acceptConfirmedBoard };
}
