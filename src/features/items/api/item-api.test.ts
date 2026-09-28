import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../../shared/api/api-error";
import { server } from "../../../test/server";
import { createFileItem, deleteItem, downloadItem, listItemTree, updateItem } from "./item-api";

const item = {
  item_id: "item-1",
  item_name: "Notes",
  item_source_type: "SNIP",
  item_source_id: "snip-1",
  item_category: ["ALL"],
  directory_id: null,
  board_id: "board-1",
  creator_id: "dev123456",
  status: "ACTIVE",
  revision: "rev-1",
  extra_params: null,
};

describe("Item API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a file Item with browser-managed multipart fields", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify(item),
      { status: 201, headers: { "Content-Type": "application/json", ETag: '"rev-1"' } },
    ));
    // Blob 避免 jsdom File 与 MSW Node 拦截器的内部表示不兼容。
    const file = Object.assign(new Blob(["你好"], { type: "text/plain" }), {
      name: "notes.txt",
      lastModified: 0,
      webkitRelativePath: "",
    }) as File;
    await expect(createFileItem("board-1", {
      file,
      itemName: "Notes",
      fingerPrint: "a".repeat(64),
      directoryId: null,
      categories: ["ALL"],
    })).resolves.toEqual(item);
    const request = fetchMock.mock.calls[0][1];
    const form = request?.body as FormData;
    expect(form?.get("item_name")).toBe("Notes");
    expect(form?.get("size")).toBe(String(file.size));
    expect(form?.has("directory_id")).toBe(false);
    expect(form?.has("categories")).toBe(false);
    expect(new Headers(request?.headers).has("Content-Type")).toBe(false);
  });

  it.each(["paper.pdf", "paper.doc", "paper.docx"])(
    "keeps %s binary bytes in the existing multipart contract",
    async (fileName) => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
        JSON.stringify(item),
        { status: 201, headers: { "Content-Type": "application/json", ETag: '"rev-1"' } },
      ));
      const bytes = new Uint8Array([0, 255, 1, 128]);
      // 自报 MIME 不可信；前端只需保持文件名与原始字节，不新增格式字段。
      const file = Object.assign(new Blob([bytes], { type: "application/octet-stream" }), {
        name: fileName,
        lastModified: 0,
        webkitRelativePath: "",
      }) as File;

      await createFileItem("board-1", {
        file,
        itemName: fileName,
        fingerPrint: "b".repeat(64),
        directoryId: null,
        categories: ["ALL"],
      });

      const form = fetchMock.mock.calls[0][1]?.body as FormData;
      const uploaded = form.get("file") as File;
      expect(uploaded.name).toBe(fileName);
      expect(new Uint8Array(await uploaded.arrayBuffer())).toEqual(bytes);
      expect(form.has("document_format")).toBe(false);
    },
  );

  it.each([
    ["notes.txt", "text/plain; charset=utf-8"],
    ["paper.pdf", "application/pdf"],
    ["paper.doc", "application/msword"],
    ["paper.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ])("accepts a compliant %s download", async (fileName, contentType) => {
    const body = new Uint8Array([0, 1, 2, 255]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(downloadResponse(fileName, body, contentType));

    const result = await downloadItem("board-1", "item-1");

    expect(result.fileName).toBe(fileName);
    expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(body);
  });

  it.each([
    ["missing file name", null, "4", "application/pdf"],
    ["invalid length", "paper.pdf", "four", "application/pdf"],
    ["wrong media type", "paper.pdf", "4", "text/plain; charset=utf-8"],
    ["mismatched length", "paper.pdf", "3", "application/pdf"],
  ])("rejects a download with %s", async (_case, fileName, length, contentType) => {
    const body = new Uint8Array([0, 1, 2, 255]);
    const headers: Record<string, string> = {
      "Content-Length": length,
      "Content-Type": contentType,
    };
    if (fileName) headers["Content-Disposition"] = downloadDisposition(fileName);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(responseBody(body), { status: 200, headers }));

    await expect(downloadItem("board-1", "item-1")).rejects.toMatchObject({
      kind: "contract",
    } satisfies Partial<ApiError>);
  });

  it("rejects an Item tree with a duplicate or wrongly placed Item", async () => {
    server.use(http.get("*/api/v1/boards/:boardId/items/tree", () => HttpResponse.json({
      root_items: [item],
      directories: [{
        dir_id: "dir-1", dir_name: "Data", parent_id: null,
        board_id: "board-1", creator_id: "dev123456",
        items: [{ ...item, directory_id: "dir-1" }], children: [],
      }],
    })));
    await expect(listItemTree("board-1")).rejects.toMatchObject({ kind: "contract" } satisfies Partial<ApiError>);
  });

  it("sends a quoted If-Match and checks the returned ETag", async () => {
    let header: string | null = null;
    server.use(http.patch("*/api/v1/boards/:boardId/items/:itemId", ({ request }) => {
      header = request.headers.get("If-Match");
      return HttpResponse.json({ ...item, item_name: "Revised", revision: "rev-2" }, {
        headers: { ETag: '"rev-2"' },
      });
    }));
    await updateItem("board-1", "item-1", "rev-1", { item_name: "Revised" });
    expect(header).toBe('"rev-1"');
  });

  it("marks interrupted deletion as result unknown and does not retry", async () => {
    let requests = 0;
    server.use(http.delete("*/api/v1/boards/:boardId/items/:itemId", () => {
      requests += 1;
      return HttpResponse.error();
    }));
    await expect(deleteItem("board-1", "item-1", "rev-1")).rejects.toMatchObject({
      kind: "result_unknown",
    } satisfies Partial<ApiError>);
    expect(requests).toBe(1);
  });
});

function downloadResponse(fileName: string, body: Uint8Array, contentType: string): Response {
  return new Response(responseBody(body), {
    status: 200,
    headers: {
      "Content-Disposition": downloadDisposition(fileName),
      "Content-Length": String(body.byteLength),
      "Content-Type": contentType,
    },
  });
}

function responseBody(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function downloadDisposition(fileName: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
