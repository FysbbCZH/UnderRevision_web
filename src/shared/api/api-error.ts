export type ApiErrorKind =
  | "business"
  | "contract"
  | "network"
  | "result_unknown";

export interface ApiErrorOptions {
  kind: ApiErrorKind;
  status?: number;
  code?: string;
  cause?: unknown;
}

/**
 * 前端统一处理的 API 错误；原始原因只用于诊断，不直接显示给用户。
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly code?: string;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
  }
}
