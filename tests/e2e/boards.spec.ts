import { expect, test, type Page, type Route } from "@playwright/test";

interface Board {
  board_id: string;
  board_name: string;
  creator_id: string;
}

const initialBoard: Board = {
  board_id: "board-1",
  board_name: "Initial Revision",
  creator_id: "dev123456",
};

/**
 * 为浏览器验收提供可变的 Board HTTP 合同，不作为生产回退。
 */
async function installBoardApi(page: Page, protectedDelete = false) {
  let boards: Board[] = [{ ...initialBoard }];

  await page.route("**/api/v1/boards**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const collectionPath = "/api/v1/boards";

    if (url.pathname === collectionPath && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: boards, total: boards.length }),
      });
      return;
    }

    if (url.pathname === collectionPath && method === "POST") {
      const body = request.postDataJSON() as { board_name: string };
      const created: Board = {
        board_id: "board-created",
        board_name: body.board_name,
        creator_id: "dev123456",
      };
      boards = [created, ...boards];
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(created),
      });
      return;
    }

    const boardId = decodeURIComponent(
      url.pathname.slice((collectionPath + "/").length),
    );
    const board = boards.find((item) => item.board_id === boardId);

    if (!board) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "BOARD_NOT_FOUND", message: "Board 不存在。" },
        }),
      });
      return;
    }

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(board),
      });
      return;
    }

    if (method === "PATCH") {
      const body = request.postDataJSON() as { board_name: string };
      const updated = { ...board, board_name: body.board_name };
      boards = boards.map((item) =>
        item.board_id === boardId ? updated : item,
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(updated),
      });
      return;
    }

    if (method === "DELETE" && protectedDelete) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "BOARD_NOT_EMPTY",
            message: "当前 Board 非空，不能删除。",
          },
        }),
      });
      return;
    }

    if (method === "DELETE") {
      boards = boards.filter((item) => item.board_id !== boardId);
      await route.fulfill({ status: 204 });
      return;
    }

    await route.abort();
  });
}

test("creates, opens, renames and deletes a Board", async ({ page }, testInfo) => {
  await installBoardApi(page);
  await page.goto("/boards");

  await expect(
    page.getByRole("heading", { name: "Initial Revision" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "创建 Board" }).click();
  await page.getByLabel("Board 名称").fill("  Literature Review  ");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "创建 Board" })
    .click();

  await expect(page.getByText("已创建“Literature Review”")).toBeVisible();
  await page.getByRole("link", { name: "查看详情" }).click();
  await expect(
    page.getByRole("heading", { name: "Literature Review" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "重命名" }).click();
  await page.getByLabel("Board 名称").fill("Revised Literature");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存新名称" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Revised Literature" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("board-details.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "删除 Board" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认删除" })
    .click();
  await expect(page).toHaveURL(/\/boards$/);
  await expect(page.getByText("Board 已删除")).toBeVisible();
  await expect(page.getByText("Revised Literature")).toHaveCount(1);
});

test("protects a non-empty Board and remains usable at a narrow viewport", async (
  { page },
  testInfo,
) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await installBoardApi(page, true);
  await page.goto("/boards/board-1");

  await page.getByRole("button", { name: "删除 Board" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认删除" })
    .click();

  await expect(page.getByText("当前 Board 非空，不能删除。")).toBeVisible();
  await expect(page).toHaveURL(/\/boards\/board-1$/);
  await page.screenshot({
    path: testInfo.outputPath("mobile-delete-protection.png"),
    fullPage: true,
  });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
