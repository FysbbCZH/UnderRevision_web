import { ApiError } from "../../../shared/api/api-error";
import {
  apiRequest,
  assertResponseOk,
  assertResponseStatus,
  parseUnknownJson,
} from "../../../shared/api/http";
import type {
  CreateDirectoryRequest,
  DirectoryResponse,
  DirectoryTreeResponse,
  UpdateDirectoryRequest,
} from "./types";
import {
  parseDirectoryResponse,
  parseDirectoryTreeResponse,
} from "./validators";

function collectionPath(boardId: string): string {
  return `/api/v1/boards/${encodeURIComponent(boardId)}/directories`;
}

function itemPath(boardId: string, directoryId: string): string {
  return `${collectionPath(boardId)}/${encodeURIComponent(directoryId)}`;
}

async function readDirectory(
  response: Response,
  boardId: string,
): Promise<DirectoryResponse> {
  const payload = await parseUnknownJson(response);
  const directory = parseDirectoryResponse(payload, boardId);
  if (!directory) {
    throw new ApiError("服务端返回的目录数据不符合接口契约。", {
      kind: "contract",
      status: response.status,
    });
  }
  return directory;
}

/** 查询当前 Board 的完整非根目录树。 */
export async function listDirectoryTree(
  boardId: string,
  signal?: AbortSignal,
): Promise<DirectoryTreeResponse> {
  const response = await apiRequest(collectionPath(boardId), { signal });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的目录树状态。");

  const payload = await parseUnknownJson(response);
  const tree = parseDirectoryTreeResponse(payload, boardId);
  if (!tree) {
    throw new ApiError("服务端返回的目录树不符合接口契约。", {
      kind: "contract",
      status: response.status,
    });
  }
  return tree;
}

/** 查询一个可操作的非根目录。 */
export async function getDirectory(
  boardId: string,
  directoryId: string,
  signal?: AbortSignal,
): Promise<DirectoryResponse> {
  const response = await apiRequest(itemPath(boardId, directoryId), { signal });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的目录详情状态。");
  return readDirectory(response, boardId);
}

/** 创建顶层目录或指定父目录下的子目录。 */
export async function createDirectory(
  boardId: string,
  requestBody: CreateDirectoryRequest,
  signal?: AbortSignal,
): Promise<DirectoryResponse> {
  const response = await apiRequest(collectionPath(boardId), {
    method: "POST",
    body: requestBody,
    signal,
    mode: "mutation",
  });
  await assertResponseOk(response);
  assertResponseStatus(response, 201, "服务端返回了未约定的目录创建状态。");
  return readDirectory(response, boardId);
}

/** 只发送调用方明确提供的目录名称或父目录变更。 */
export async function updateDirectory(
  boardId: string,
  directoryId: string,
  requestBody: UpdateDirectoryRequest,
  signal?: AbortSignal,
): Promise<DirectoryResponse> {
  const response = await apiRequest(itemPath(boardId, directoryId), {
    method: "PATCH",
    body: requestBody,
    signal,
    mode: "mutation",
  });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的目录更新状态。");
  return readDirectory(response, boardId);
}

/** 删除目录；只有明确收到 204 才确认成功。 */
export async function deleteDirectory(
  boardId: string,
  directoryId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await apiRequest(itemPath(boardId, directoryId), {
    method: "DELETE",
    signal,
    mode: "mutation",
  });
  await assertResponseOk(response);
  assertResponseStatus(response, 204, "服务端返回了未约定的目录删除状态。");
}
