import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { server } from "../test/server";
import { BoardsPage } from "./BoardsPage";

const board = {
  board_id: "board-1",
  board_name: "Revision Study",
  creator_id: "dev123456",
  root_directory_id: "root-1",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <BoardsPage />
    </MemoryRouter>,
  );
}

describe("BoardsPage", () => {
  it("renders the list in server order with the server total", async () => {
    const first = { ...board, board_id: "board-2", board_name: "First returned" };
    server.use(
      http.get("*/api/v1/boards", () =>
        HttpResponse.json({ items: [first, board], total: 9 }),
      ),
    );

    renderPage();

    expect(await screen.findByText("First returned")).toBeInTheDocument();
    expect(screen.getByText("Revision Study")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /查看 Board/ });
    expect(links[0]).toHaveAttribute("href", "/boards/board-2");
  });

  it("shows an empty state instead of an error", async () => {
    server.use(
      http.get("*/api/v1/boards", () =>
        HttpResponse.json({ items: [], total: 0 }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "从第一个 Board 开始" }),
    ).toBeInTheDocument();
  });

  it("creates a board with the trimmed name and shows confirmed feedback", async () => {
    let submittedBody: unknown;
    server.use(
      http.get("*/api/v1/boards", () =>
        HttpResponse.json({ items: [], total: 0 }),
      ),
      http.post("*/api/v1/boards", async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(board, { status: 201 });
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "从第一个 Board 开始" });
    await user.click(screen.getByRole("button", { name: "创建 Board" }));
    await user.type(screen.getByLabelText("Board 名称"), "  Revision Study  ");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "创建 Board",
      }),
    );

    expect(
      await screen.findByText("已创建“Revision Study”"),
    ).toBeInTheDocument();
    expect(submittedBody).toEqual({ board_name: "Revision Study" });
  });
});
