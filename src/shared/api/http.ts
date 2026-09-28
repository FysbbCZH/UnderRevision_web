import { getRuntimeConfig } from "../../app/runtime-config";
import { ApiError } from "./api-error";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

type RequestMode = "query" | "mutation";

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  mode?: RequestMode;
}

/** 判断未知值是否为可安全展示的统一错误信封。 */
export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string" &&
    value.error.message.trim().length > 0
  );
}

/**
 * 发出同源或运行时配置指向的 API 请求，并区分查询失败与变更结果未知。
 */
export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const { method = "GET", body, headers, signal, mode = "query" } = options;
  const requestHeaders = new Headers(headers);
  const requestBody = serializeRequestBody(body, requestHeaders);

  try {
    return await fetch(`${getRuntimeConfig().apiBaseUrl}${path}`, {
      method,
      signal,
      headers: requestHeaders,
      body: requestBody,
    });
  } catch (error) {
    const isMutation = mode === "mutation";
    throw new ApiError(
      isMutation
        ? "请求结果暂时无法确认，请先重新查询服务端状态。"
        : "无法连接服务端，请检查网络后手动重试。",
      {
        kind: isMutation ? "result_unknown" : "network",
        cause: error,
      },
    );
  }
}

/**
 * 保持既有对象 JSON 行为，同时让 FormData 自己生成 multipart boundary。
 */
function serializeRequestBody(
  body: unknown,
  headers: Headers,
): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }
  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    typeof body === "string"
  ) {
    return body;
  }
  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}

/** 解析 JSON；成功状态返回不可解析内容时按合同错误处理。 */
export async function parseUnknownJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new ApiError("服务端返回了无法解析的响应。", {
      kind: "contract",
      status: response.status,
      cause: error,
    });
  }
}

/** 将非成功 HTTP 响应转换为稳定业务错误。 */
export async function assertResponseOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const payload = await parseErrorResponse(response);
  throw new ApiError(payload.error.message, {
    kind: "business",
    status: response.status,
    code: payload.error.code,
  });
}

/** 对每个端点约定的唯一成功状态做显式断言。 */
export function assertResponseStatus(
  response: Response,
  expectedStatus: number,
  message: string,
): void {
  if (response.status !== expectedStatus) {
    throw new ApiError(message, {
      kind: "contract",
      status: response.status,
    });
  }
}

/** 判断未知值是否为非数组对象。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseErrorResponse(response: Response): Promise<ApiErrorResponse> {
  try {
    const payload: unknown = await response.json();
    if (isApiErrorResponse(payload)) {
      return payload;
    }
  } catch {
    // 非统一错误正文不可直接展示，避免泄漏 HTML、堆栈或内部实现信息。
  }

  return {
    error: {
      code: "UNEXPECTED_RESPONSE",
      message: "服务暂时无法完成该操作，请稍后重试。",
    },
  };
}
