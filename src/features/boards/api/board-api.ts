import { ApiError } from "../../../shared/api/api-error";
import {
  apiRequest,
  assertResponseOk,
  assertResponseStatus,
  parseUnknownJson,
} from "../../../shared/api/http";
import type {
  BoardListResponse,
  BoardResponse,
  CreateBoardRequest,
  UpdateBoardRequest,
} from "./types";
import { parseBoardListResponse, parseBoardResponse } from "./validators";

async function readBoard(response: Response): Promise<BoardResponse> {
  const payload = await parseUnknownJson(response);
  const board = parseBoardResponse(payload);
  if (!board) {
    throw new ApiError("服务端返回的 Board 数据不符合接口契约。", {
      kind: "contract",
      status: response.status,
    });
  }

  return board;
}

/**
 * 查询全部 Board，保持服务端顺序和总数。
 */
export async function listBoards(
  signal?: AbortSignal,
): Promise<BoardListResponse> {
  const response = await apiRequest("/api/v1/boards", { signal });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的列表状态。");

  const payload = await parseUnknownJson(response);
  const boardList = parseBoardListResponse(payload);
  if (!boardList) {
    throw new ApiError("服务端返回的 Board 列表不符合接口契约。", {
      kind: "contract",
      status: response.status,
    });
  }

  return boardList;
}

/**
 * 查询指定 Board 的完整基础信息。
 */
export async function getBoard(
  boardId: string,
  signal?: AbortSignal,
): Promise<BoardResponse> {
  const response = await apiRequest(
    `/api/v1/boards/${encodeURIComponent(boardId)}`,
    { signal },
  );
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的详情状态。");

  return readBoard(response);
}

/**
 * 创建 Board。网络异常时不能判断服务端是否已写入，因此返回结果未知。
 */
export async function createBoard(
  requestBody: CreateBoardRequest,
  signal?: AbortSignal,
): Promise<BoardResponse> {
  const response = await apiRequest("/api/v1/boards", {
    method: "POST",
    body: requestBody,
    signal,
    mode: "mutation",
  });
  await assertResponseOk(response);
  assertResponseStatus(response, 201, "服务端返回了未约定的创建状态。");

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
  const response = await apiRequest(
    `/api/v1/boards/${encodeURIComponent(boardId)}`,
    {
      method: "PATCH",
      body: requestBody,
      signal,
      mode: "mutation",
    },
  );
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的更新状态。");

  return readBoard(response);
}

/**
 * 删除 Board，只有明确收到 204 时才视为成功。
 */
export async function deleteBoard(
  boardId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await apiRequest(
    `/api/v1/boards/${encodeURIComponent(boardId)}`,
    {
      method: "DELETE",
      signal,
      mode: "mutation",
    },
  );
  await assertResponseOk(response);
  assertResponseStatus(response, 204, "服务端返回了未约定的删除状态。");
}
