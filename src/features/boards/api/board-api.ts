import { getRuntimeConfig } from "../../../app/runtime-config";
import { BoardApiError } from "./errors";
import type {
  BoardListResponse,
  BoardResponse,
  CreateBoardRequest,
  ErrorResponse,
  UpdateBoardRequest,
} from "./types";
import {
  isBoardListResponse,
  isBoardResponse,
  isErrorResponse,
} from "./validators";

type MutationMode = "query" | "mutation";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: CreateBoardRequest | UpdateBoardRequest;
  signal?: AbortSignal;
  mode?: MutationMode;
}

function endpoint(path: string): string {
  return `${getRuntimeConfig().apiBaseUrl}${path}`;
}

async function parseUnknownJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new BoardApiError("服务端返回了无法解析的响应。", {
      kind: "contract",
      status: response.status,
      cause: error,
    });
  }
}

async function parseErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    const payload: unknown = await response.json();
    if (isErrorResponse(payload)) {
      return payload;
    }
  } catch {
    // 预期错误如果没有统一信封，只返回安全的通用消息，不泄漏响应正文。
  }

  return {
    error: {
      code: "UNEXPECTED_RESPONSE",
      message: "服务暂时无法完成该操作，请稍后重试。",
    },
  };
}

async function request(
  path: string,
  options: RequestOptions = {},
): Promise<Response> {
  const { method = "GET", body, signal, mode = "query" } = options;

  try {
    return await fetch(endpoint(path), {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const isMutation = mode === "mutation";
    throw new BoardApiError(
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

async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const payload = await parseErrorResponse(response);
  throw new BoardApiError(payload.error.message, {
    kind: "business",
    status: response.status,
    code: payload.error.code,
  });
}

async function readBoard(response: Response): Promise<BoardResponse> {
  const payload = await parseUnknownJson(response);
  if (!isBoardResponse(payload)) {
    throw new BoardApiError("服务端返回的 Board 数据不符合接口契约。", {
      kind: "contract",
      status: response.status,
    });
  }

  return payload;
}

/**
 * 查询全部 Board，保持服务端顺序和总数。
 */
export async function listBoards(
  signal?: AbortSignal,
): Promise<BoardListResponse> {
  const response = await request("/api/v1/boards", { signal });
  await assertOk(response);

  if (response.status !== 200) {
    throw new BoardApiError("服务端返回了未约定的列表状态。", {
      kind: "contract",
      status: response.status,
    });
  }

  const payload = await parseUnknownJson(response);
  if (!isBoardListResponse(payload)) {
    throw new BoardApiError("服务端返回的 Board 列表不符合接口契约。", {
      kind: "contract",
      status: response.status,
    });
  }

  return payload;
}

/**
 * 查询指定 Board 的完整基础信息。
 */
export async function getBoard(
  boardId: string,
  signal?: AbortSignal,
): Promise<BoardResponse> {
  const response = await request(
    `/api/v1/boards/${encodeURIComponent(boardId)}`,
    { signal },
  );
  await assertOk(response);

  if (response.status !== 200) {
    throw new BoardApiError("服务端返回了未约定的详情状态。", {
      kind: "contract",
      status: response.status,
    });
  }

  return readBoard(response);
}

/**
 * 创建 Board。网络异常时不能判断服务端是否已写入，因此返回结果未知。
 */
export async function createBoard(
  requestBody: CreateBoardRequest,
  signal?: AbortSignal,
): Promise<BoardResponse> {
  const response = await request("/api/v1/boards", {
    method: "POST",
    body: requestBody,
    signal,
    mode: "mutation",
  });
  await assertOk(response);

  if (response.status !== 201) {
    throw new BoardApiError("服务端返回了未约定的创建状态。", {
      kind: "contract",
      status: response.status,
    });
  }

  return readBoard(response);
}

/**
 * 修改 Board 名称，只发送契约允许的 board_name 字段。
 */
export async function updateBoardName(
  boardId: string,
  requestBody: UpdateBoardRequest,
  signal?: AbortSignal,
): Promise<BoardResponse> {
  const response = await request(
    `/api/v1/boards/${encodeURIComponent(boardId)}`,
    {
      method: "PATCH",
      body: requestBody,
      signal,
      mode: "mutation",
    },
  );
  await assertOk(response);

  if (response.status !== 200) {
    throw new BoardApiError("服务端返回了未约定的更新状态。", {
      kind: "contract",
      status: response.status,
    });
  }

  return readBoard(response);
}

/**
 * 删除 Board，只有明确收到 204 时才视为成功。
 */
export async function deleteBoard(
  boardId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await request(
    `/api/v1/boards/${encodeURIComponent(boardId)}`,
    {
      method: "DELETE",
      signal,
      mode: "mutation",
    },
  );
  await assertOk(response);

  if (response.status !== 204) {
    throw new BoardApiError("服务端返回了未约定的删除状态。", {
      kind: "contract",
      status: response.status,
    });
  }
}
