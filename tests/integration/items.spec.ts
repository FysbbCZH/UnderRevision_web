import { readFile } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

test("manages Items end to end against an isolated real FastAPI", async ({ page }) => {
  await createBoard(page, "Item Integration");
  const boardId = new URL(page.url()).pathname.split("/").at(-1);
  expect(boardId).toBeTruthy();

  await createDirectories(page);
  await page.getByRole("button", { name: "资料" }).click();

  await uploadItem(page, {
    fileName: "root-notes.txt",
    content: "root 内容\n",
    itemName: "Root Item",
  });
  const rootCreated = await readTree(page, boardId!);
  const rootItem = rootCreated.root_items.find((item) => item.item_name === "Root Item");
  expect(rootItem?.item_category).toEqual(["ALL"]);

  const documents = [
    {
      fileName: "paper.pdf",
      content: Buffer.from("%PDF-1.7\nfrontend integration"),
      itemName: "PDF Item",
      reportedMimeType: "text/plain",
      expectedContentType: "application/pdf",
    },
    {
      fileName: "paper.doc",
      content: Buffer.concat([
        Buffer.from("D0CF11E0A1B11AE1", "hex"),
        Buffer.from("frontend integration"),
      ]),
      itemName: "DOC Item",
      reportedMimeType: "application/octet-stream",
      expectedContentType: "application/msword",
    },
    {
      fileName: "paper.docx",
      content: Buffer.concat([
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from("frontend integration"),
      ]),
      itemName: "DOCX Item",
      reportedMimeType: "application/zip",
      expectedContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  ];
  for (const document of documents) {
    await uploadItem(page, document);
    await assertDocumentRoundTrip(page, boardId!, document);
  }

  await uploadItem(page, {
    fileName: "directory-notes.txt",
    content: "目录内容\n第二行",
    itemName: "Directory Item",
    directoryName: "Child",
    categories: ["DATA", "REFERENCE"],
  });
  const beforeEdit = findItem(await readTree(page, boardId!), "Directory Item");
  expect(beforeEdit.directory_id).not.toBeNull();
  expect(beforeEdit.item_category).toEqual(["DATA", "REFERENCE"]);

  await page.getByRole("button", { name: "编辑信息" }).click();
  const editDialog = page.getByRole("dialog");
  await editDialog.getByLabel("Item 名称").fill("Reviewed Item");
  await editDialog.getByLabel("目标位置").selectOption({ label: "Parent" });
  await editDialog.getByRole("checkbox", { name: "DATA" }).uncheck();
  await editDialog.getByRole("checkbox", { name: "SOURCE" }).check();
  await editDialog.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByText("Item 信息已更新。")).toBeVisible();

  const afterEdit = findItem(await readTree(page, boardId!), "Reviewed Item");
  expect(afterEdit.revision).not.toBe(beforeEdit.revision);
  expect(afterEdit.item_category).toEqual(["REFERENCE", "SOURCE"]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载文件" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("directory-notes.txt");
  expect(await readFile(await download.path(), "utf8")).toBe("目录内容\n第二行");

  await page.getByRole("button", { name: "目录设置" }).click();
  await page.getByRole("button", { name: /^Parent\s*1 个子目录$/ }).click();
  await page.getByRole("button", { name: "删除目录" }).click();
  await expect(page.getByText(/其中 Item 都会被永久删除/)).toBeVisible();
  await page.getByRole("button", { name: "确认删除目录" }).click();
  await expect(page.getByText("已删除目录“Parent”。")).toBeVisible();

  await page.getByRole("button", { name: "资料" }).click();
  await expect(page.getByText("Reviewed Item")).toHaveCount(0);
  const afterDirectoryDelete = await readTree(page, boardId!);
  expect(() => findItem(afterDirectoryDelete, "Reviewed Item")).toThrow();

  await page.getByRole("button", { name: /Root Item/ }).click();
  await page.getByRole("button", { name: "删除 Item" }).click();
  await page.getByRole("button", { name: "确认删除 Item" }).click();
  await expect(page.getByText("已删除 Item“Root Item”。")).toBeVisible();
  await expect(page.getByRole("button", { name: /Root Item/ })).toHaveCount(0);

  const itemPath = `/api/v1/boards/${boardId}/items/${rootItem?.item_id}`;
  expect((await page.request.get(itemPath)).status()).toBe(404);
  expect((await page.request.get(`${itemPath}/content`)).status()).toBe(404);
});

async function createBoard(page: Page, name: string): Promise<void> {
  await page.goto("/boards");
  await page.getByRole("button", { name: "创建 Board" }).click();
  await page.getByLabel("Board 名称").fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "创建 Board" }).click();
  await expect(page.getByText(`已创建“${name}”`)).toBeVisible();
  await page.getByRole("link", { name: "查看详情" }).first().click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function createDirectories(page: Page): Promise<void> {
  await page.getByRole("button", { name: "目录设置" }).click();
  await page.getByRole("button", { name: "创建第一个目录" }).click();
  await page.getByLabel("目录名称").fill("Parent");
  await page.getByRole("dialog").getByRole("button", { name: "创建目录" }).click();
  await expect(page.getByText("已创建目录“Parent”。")).toBeVisible();
  await page.getByRole("button", { name: "新建子目录" }).click();
  await page.getByLabel("目录名称").fill("Child");
  await page.getByRole("dialog").getByRole("button", { name: "创建目录" }).click();
  await expect(page.getByText("已创建目录“Child”。")).toBeVisible();
}

async function uploadItem(page: Page, options: {
  fileName: string;
  content: string | Buffer;
  itemName: string;
  reportedMimeType?: string;
  directoryName?: string;
  categories?: string[];
}): Promise<void> {
  await page.getByRole("button", { name: "上传文件" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: options.fileName,
    mimeType: options.reportedMimeType ?? "text/plain",
    buffer: typeof options.content === "string" ? Buffer.from(options.content) : options.content,
  });
  await dialog.getByLabel("Item 名称").fill(options.itemName);
  if (options.directoryName) {
    const target = dialog.getByRole("option", {
      name: new RegExp(`${escapeRegExp(options.directoryName)}$`),
    });
    await dialog.getByLabel("目标位置").selectOption(await target.getAttribute("value") ?? "");
  }
  for (const category of options.categories ?? []) {
    await dialog.getByRole("checkbox", { name: category, exact: true }).check();
  }
  await dialog.getByRole("button", { name: "上传并创建" }).click();
  await expect(page.getByText(`已创建 Item“${options.itemName}”。`)).toBeVisible();
}

/** 通过真实 HTTP 响应和浏览器下载共同验证一种二进制文档。 */
async function assertDocumentRoundTrip(page: Page, boardId: string, document: {
  fileName: string;
  content: Buffer;
  itemName: string;
  expectedContentType: string;
}): Promise<void> {
  const item = findItem(await readTree(page, boardId), document.itemName);
  const contentPath = `/api/v1/boards/${boardId}/items/${item.item_id}/content`;
  const response = await page.request.get(contentPath);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe(document.expectedContentType);
  expect(response.headers()["content-length"]).toBe(String(document.content.byteLength));
  expect(response.headers()["content-disposition"]).toContain(encodeURIComponent(document.fileName));
  expect(await response.body()).toEqual(document.content);

  await page.getByRole("button", { name: new RegExp(document.itemName) }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载文件" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(document.fileName);
  expect(await readFile(await download.path())).toEqual(document.content);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface ApiItem {
  item_id: string;
  item_name: string;
  item_category: string[];
  directory_id: string | null;
  revision: string;
}

interface ApiDirectory {
  items: ApiItem[];
  children: ApiDirectory[];
}

interface ApiTree {
  root_items: ApiItem[];
  directories: ApiDirectory[];
}

async function readTree(page: Page, boardId: string): Promise<ApiTree> {
  const response = await page.request.get(`/api/v1/boards/${boardId}/items/tree`);
  expect(response.status()).toBe(200);
  return response.json() as Promise<ApiTree>;
}

function findItem(tree: ApiTree, name: string): ApiItem {
  const item = tree.root_items.find((candidate) => candidate.item_name === name)
    ?? findInDirectories(tree.directories, name);
  if (!item) throw new Error(`Item ${name} 不存在。`);
  return item;
}

function findInDirectories(directories: ApiDirectory[], name: string): ApiItem | undefined {
  for (const directory of directories) {
    const item = directory.items.find((candidate) => candidate.item_name === name);
    if (item) return item;
    const nested = findInDirectories(directory.children, name);
    if (nested) return nested;
  }
  return undefined;
}
