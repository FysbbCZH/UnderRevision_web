import { ApiError } from "../../../shared/api/api-error";
import {
  apiRequest,
  assertResponseOk,
  assertResponseStatus,
  parseUnknownJson,
} from "../../../shared/api/http";
import type {
  CreateFileItemRequest,
  ItemDirectoryTreeResponse,
  ItemDownload,
  ItemResponse,
  UpdateItemRequest,
} from "./types";
import { parseItemResponse, parseItemTreeResponse } from "./validators";

function collectionPath(boardId: string): string {
  return `/api/v1/boards/${encodeURIComponent(boardId)}/items`;
}

function itemPath(boardId: string, itemId: string): string {
  return `${collectionPath(boardId)}/${encodeURIComponent(itemId)}`;
}

/** 使用一次 multipart 请求上传文件并创建 Item。 */
export async function createFileItem(
  boardId: string,
  request: CreateFileItemRequest,
  signal?: AbortSignal,
): Promise<ItemResponse> {
  const form = new FormData();
  form.append("file", request.file, request.file.name);
  form.append("item_name", request.itemName);
  form.append("finger_print", request.fingerPrint);
  form.append("size", String(request.file.size));
  if (request.directoryId !== null) form.append("directory_id", request.directoryId);
  if (!(request.categories.length === 1 && request.categories[0] === "ALL")) {
    for (const category of request.categories) form.append("categories", category);
  }
  const response = await apiRequest(`${collectionPath(boardId)}/files`, {
    method: "POST",
    body: form,
    signal,
    mode: "mutation",
  });
  await assertResponseOk(response);
  assertResponseStatus(response, 201, "服务端返回了未约定的 Item 创建状态。");
  return readItem(response, boardId, true);
}

/** 查询 Board 根级 Item 与递归目录树。 */
export async function listItemTree(
  boardId: string,
  signal?: AbortSignal,
): Promise<ItemDirectoryTreeResponse> {
  const response = await apiRequest(`${collectionPath(boardId)}/tree`, { signal });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的 Item 树状态。");
  const tree = parseItemTreeResponse(await parseUnknownJson(response), boardId);
  if (!tree) throw contractError("服务端返回的 Item 树不符合接口契约。", response);
  return tree;
}

/** 查询一个 ACTIVE Item，并校验响应 ETag。 */
export async function getItem(
  boardId: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<ItemResponse> {
  const response = await apiRequest(itemPath(boardId, itemId), { signal });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的 Item 详情状态。");
  return readItem(response, boardId, true);
}

/** 只发送实际变化字段，并用当前 revision 进行并发保护。 */
export async function updateItem(
  boardId: string,
  itemId: string,
  revision: string,
  request: UpdateItemRequest,
  signal?: AbortSignal,
): Promise<ItemResponse> {
  const response = await apiRequest(itemPath(boardId, itemId), {
    method: "PATCH",
    body: request,
    headers: { "If-Match": quoteRevision(revision) },
    signal,
    mode: "mutation",
  });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的 Item 修改状态。");
  return readItem(response, boardId, true);
}

/** 下载 Item 文件并采用服务端声明的文件名。 */
export async function downloadItem(
  boardId: string,
  itemId: string,
  signal?: AbortSignal,
): Promise<ItemDownload> {
  const response = await apiRequest(`${itemPath(boardId, itemId)}/content`, { signal });
  await assertResponseOk(response);
  assertResponseStatus(response, 200, "服务端返回了未约定的 Item 下载状态。");
  const fileName = parseDownloadFileName(response.headers.get("Content-Disposition"));
  if (!fileName) {
    throw contractError("服务端没有返回合规的下载文件名。", response);
  }
  assertDownloadContentType(fileName, response.headers.get("Content-Type"), response);
  const expectedSize = parseContentLength(response.headers.get("Content-Length"), response);
  const blob = await response.blob();
  if (blob.size !== expectedSize) {
    throw contractError("服务端下载内容长度与响应头不一致。", response);
  }
  return {
    blob,
    fileName,
  };
}

/** 只有明确收到 204 才确认删除成功。 */
export async function deleteItem(
  boardId: string,
  itemId: string,
  revision: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await apiRequest(itemPath(boardId, itemId), {
    method: "DELETE",
    headers: { "If-Match": quoteRevision(revision) },
    signal,
    mode: "mutation",
  });
  await assertResponseOk(response);
  assertResponseStatus(response, 204, "服务端返回了未约定的 Item 删除状态。");
}

async function readItem(response: Response, boardId: string, checkEtag: boolean): Promise<ItemResponse> {
  const item = parseItemResponse(await parseUnknownJson(response), boardId);
  if (!item) throw contractError("服务端返回的 Item 数据不符合接口契约。", response);
  if (checkEtag && response.headers.get("ETag") !== quoteRevision(item.revision)) {
    throw contractError("服务端 Item 的 ETag 与 revision 不一致。", response);
  }
  return item;
}

function quoteRevision(revision: string): string {
  return `"${revision}"`;
}

function parseDownloadFileName(header: string | null): string | null {
  const match = header?.match(/filename\*=UTF-8''([^;]+)/i);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const safeName = Array.from(decoded, (character) => {
      const code = character.charCodeAt(0);
      return character === "/" || character === "\\" || code < 32 || code === 127
        ? "_"
        : character;
    }).join("").trim();
    return safeName || null;
  } catch {
    return null;
  }
}

/** 按服务端文件名校验下载媒体类型，不使用上传阶段不可信的 File.type。 */
function assertDownloadContentType(
  fileName: string,
  contentType: string | null,
  response: Response,
): void {
  const suffix = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  const expectedTypes: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  const expected = expectedTypes[suffix] ?? "text/plain; charset=utf-8";
  if (!contentType || normalizeContentType(contentType) !== normalizeContentType(expected)) {
    throw contractError("服务端下载文件的 Content-Type 与文件格式不一致。", response);
  }
}

/** 解析服务端声明的非负安全字节数，供读取 Blob 后复核。 */
function parseContentLength(header: string | null, response: Response): number {
  const normalized = header?.trim() ?? "";
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    throw contractError("服务端没有返回合规的 Content-Length。", response);
  }
  const size = Number(normalized);
  if (!Number.isSafeInteger(size)) {
    throw contractError("服务端返回的 Content-Length 超出安全范围。", response);
  }
  return size;
}

function normalizeContentType(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/charset="utf-8"/g, "charset=utf-8");
}

function contractError(message: string, response: Response): ApiError {
  return new ApiError(message, { kind: "contract", status: response.status });
}
