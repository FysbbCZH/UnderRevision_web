import { ApiError } from "../../../shared/api/api-error";

export { ApiError as BoardApiError } from "../../../shared/api/api-error";
export type { ApiErrorKind as BoardApiErrorKind } from "../../../shared/api/api-error";

/**
 * 把未知异常转换为安全的用户消息。
 */
export function getBoardErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求未能完成，请稍后重试。";
}
