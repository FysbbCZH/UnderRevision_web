import { describe, expect, it } from "vitest";

import { validateBoardName } from "./validate-board-name";

describe("validateBoardName", () => {
  it("trims a valid name", () => {
    expect(validateBoardName("  Revision workspace  ")).toEqual({
      value: "Revision workspace",
      error: null,
    });
  });

  it("rejects an empty name", () => {
    expect(validateBoardName("   ").error).toBe("请输入 Board 名称。");
  });

  it("counts Unicode code points for the 200-character limit", () => {
    expect(validateBoardName("研".repeat(200)).error).toBeNull();
    expect(validateBoardName("研".repeat(201)).error).toBe(
      "Board 名称不能超过 200 个字符。",
    );
  });
});
