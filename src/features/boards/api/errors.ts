export type BoardApiErrorKind =
  | "business"
  | "contract"
  | "network"
  | "result_unknown";

interface BoardApiErrorOptions {
  kind: BoardApiErrorKind;
  status?: number;
  code?: string;
  cause?: unknown;
}

/**
 * 前端可处理的 API 错误。内部原因只保留用于诊断，不直接展示给用户。
 */
export class BoardApiError extends Error {
  readonly kind: BoardApiErrorKind;
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options: BoardApiErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "BoardApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
  }
}

/**
 * 把未知异常转换为安全的用户消息。
 */
export function getBoardErrorMessage(error: unknown): string {
  if (error instanceof BoardApiError) {
    return error.message;
  }

  return "请求未能完成，请稍后重试。";
}
