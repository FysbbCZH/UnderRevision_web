import { expect, test, type Page, type Route } from "@playwright/test";

interface MockDirectory {
  dir_id: string;
  dir_name: string;
  parent_id: string | null;
  board_id: string;
  creator_id: string;
}

interface MockDirectoryTreeNode extends MockDirectory {
  children: MockDirectoryTreeNode[];
}

const board = {
  board_id: "board-1",
  board_name: "Directory Design",
  creator_id: "dev123456",
};

/**
 * 安装可变的 Board 与 Directory HTTP 合同，用于浏览器级目录流程验收。
 */
async function installDirectoryApi(page: Page) {
  let nextId = 1;
  let directories: MockDirectory[] = [
    createMockDirectory("source", "Source", null),
    createMockDirectory("archive", "Archive", null),
  ];

  await page.route("**/api/v1/boards/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const boardPath = `/api/v1/boards/${board.board_id}`;
    const collectionPath = `${boardPath}/directories`;

    if (url.pathname === `${boardPath}/items/tree` && method === "GET") {
      await fulfillJson(route, 200, { root_items: [], directories: [] });
      return;
    }

    if (url.pathname === boardPath && method === "GET") {
      await fulfillJson(route, 200, board);
      return;
    }

    if (url.pathname === collectionPath && method === "GET") {
      await fulfillJson(route, 200, { directories: buildTree(directories) });
      return;
    }

    if (url.pathname === collectionPath && method === "POST") {
      const body = request.postDataJSON() as {
        dir_name: string;
        parent_id: string | null;
      };
      if (body.dir_name === "Duplicate") {
        await fulfillJson(route, 409, {
          error: {
            code: "DIRECTORY_NAME_CONFLICT",
            message: "同一位置已存在同名目录。",
          },
        });
        return;
      }
      const created = createMockDirectory(
        `directory-${nextId++}`,
        body.dir_name,
        body.parent_id,
      );
      directories.push(created);
      await fulfillJson(route, 201, created);
      return;
    }

    if (!url.pathname.startsWith(`${collectionPath}/`)) {
      await route.abort();
      return;
    }

    const directoryId = decodeURIComponent(
      url.pathname.slice(`${collectionPath}/`.length),
    );
    const directory = directories.find((item) => item.dir_id === directoryId);
    if (!directory) {
      await fulfillJson(route, 404, {
        error: { code: "DIRECTORY_NOT_FOUND", message: "目录不存在。" },
      });
      return;
    }

    if (method === "GET") {
      await fulfillJson(route, 200, directory);
      return;
    }

    if (method === "PATCH") {
      const body = request.postDataJSON() as {
        dir_name?: string;
        parent_id?: string | null;
      };
      const updated = {
        ...directory,
        ...(body.dir_name === undefined ? {} : { dir_name: body.dir_name }),
        ...(Object.hasOwn(body, "parent_id") ? { parent_id: body.parent_id ?? null } : {}),
      };
      directories = directories.map((item) =>
        item.dir_id === directoryId ? updated : item,
      );
      await fulfillJson(route, 200, updated);
      return;
    }

    if (method === "DELETE") {
      const deletedIds = collectDescendantIds(directories, directoryId);
      directories = directories.filter((item) => !deletedIds.has(item.dir_id));
      await route.fulfill({ status: 204 });
      return;
    }

    await route.abort();
  });
}

test("creates, renames, moves and recursively deletes directories", async ({
  page,
}, testInfo) => {
  await installDirectoryApi(page);
  await page.goto("/boards/board-1");
  await page.getByRole("button", { name: "目录设置" }).click();

  await page.getByRole("button", { name: "Source", exact: true }).click();
  await page.getByRole("button", { name: "新建子目录" }).click();
  await page.getByLabel("目录名称").fill("Working Notes");
  await page.getByRole("dialog").getByRole("button", { name: "创建目录" }).click();
  await expect(page.getByText("已创建目录“Working Notes”。")).toBeVisible();

  await page
    .getByRole("complementary", { name: "目录 Working Notes 的操作" })
    .getByRole("button", { name: "重命名" })
    .click();
  await page.getByLabel("目录名称").fill("Reviewed Notes");
  await page.getByRole("dialog").getByRole("button", { name: "保存新名称" }).click();
  await expect(page.getByText("已将目录重命名为“Reviewed Notes”。")).toBeVisible();

  await page.getByRole("button", { name: "移动" }).click();
  await page.getByLabel("目标位置").selectOption({ label: "Archive" });
  await page.getByRole("dialog").getByRole("button", { name: "确认移动" }).click();
  await expect(page.getByText("位置：Archive")).toBeVisible();

  await page.getByRole("button", { name: /^Archive\s*1 个子目录$/ }).click();
  await page.getByRole("button", { name: "删除目录" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "确认删除目录" }).click();
  await expect(page.getByText("已删除目录“Archive”。")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reviewed Notes", exact: true })).toHaveCount(0);

  await page.screenshot({
    path: testInfo.outputPath("directory-workflow.png"),
    fullPage: true,
  });
});

test("keeps a failed create editable and avoids narrow-screen overflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await installDirectoryApi(page);
  await page.goto("/boards/board-1");
  await page.getByRole("button", { name: "目录设置" }).click();

  await page.getByRole("button", { name: "新建顶层目录" }).click();
  await page.getByLabel("目录名称").fill("Duplicate");
  await page.getByRole("dialog").getByRole("button", { name: "创建目录" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("同一位置已存在同名目录。")).toBeVisible();
  await expect(page.getByLabel("目录名称")).toHaveValue("Duplicate");
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("directory-mobile-error.png"),
    fullPage: true,
  });
});

function createMockDirectory(
  dirId: string,
  dirName: string,
  parentId: string | null,
): MockDirectory {
  return {
    dir_id: dirId,
    dir_name: dirName,
    parent_id: parentId,
    board_id: board.board_id,
    creator_id: board.creator_id,
  };
}

function buildTree(directories: MockDirectory[], parentId: string | null = null): MockDirectoryTreeNode[] {
  return directories
    .filter((directory) => directory.parent_id === parentId)
    .map((directory) => ({
      ...directory,
      children: buildTree(directories, directory.dir_id),
    }));
}

function collectDescendantIds(
  directories: MockDirectory[],
  directoryId: string,
): Set<string> {
  const collected = new Set([directoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const directory of directories) {
      if (directory.parent_id && collected.has(directory.parent_id) && !collected.has(directory.dir_id)) {
        collected.add(directory.dir_id);
        changed = true;
      }
    }
  }
  return collected;
}

async function fulfillJson(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}
