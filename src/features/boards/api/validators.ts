import { isRecord } from "../../../shared/api/http";
import type { BoardListResponse, BoardResponse } from "./types";

/**
 * 检查服务端对象是否完整满足 Board 响应契约。
 */
export function parseBoardResponse(value: unknown): BoardResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.board_id !== "string" ||
    typeof value.board_name !== "string" ||
    typeof value.creator_id !== "string"
  ) {
    return null;
  }

  // 只复制声明字段，避免过渡期服务端多余字段进入页面状态。
  return {
    board_id: value.board_id,
    board_name: value.board_name,
    creator_id: value.creator_id,
  };
}

/**
 * 检查列表信封及其中每一个 Board，避免部分非法数据进入页面状态。
 */
export function parseBoardListResponse(value: unknown): BoardListResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !Array.isArray(value.items) ||
    typeof value.total !== "number" ||
    !Number.isInteger(value.total) ||
    value.total < 0
  ) {
    return null;
  }

  const items = value.items.map(parseBoardResponse);
  if (items.some((item) => item === null)) {
    return null;
  }

  return { items: items as BoardResponse[], total: value.total };
}
