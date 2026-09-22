import type {
  BoardListResponse,
  BoardResponse,
  ErrorResponse,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 检查服务端对象是否完整满足 Board 响应契约。
 */
export function isBoardResponse(value: unknown): value is BoardResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.board_id === "string" &&
    typeof value.board_name === "string" &&
    typeof value.creator_id === "string" &&
    typeof value.root_directory_id === "string"
  );
}

/**
 * 检查列表信封及其中每一个 Board，避免部分非法数据进入页面状态。
 */
export function isBoardListResponse(
  value: unknown,
): value is BoardListResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    value.items.every(isBoardResponse) &&
    typeof value.total === "number" &&
    Number.isInteger(value.total) &&
    value.total >= 0
  );
}

/**
 * 检查统一错误信封，只允许稳定错误码和可读消息进入用户提示。
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string" &&
    value.error.message.trim().length > 0
  );
}
