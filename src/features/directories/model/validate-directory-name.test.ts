import { describe, expect, it } from "vitest";

import { validateDirectoryName } from "./validate-directory-name";

describe("validateDirectoryName", () => {
  it("trims a valid directory name", () => {
    expect(validateDirectoryName("  References  ")).toEqual({
      value: "References",
      error: null,
    });
  });

  it("rejects an empty directory name", () => {
    expect(validateDirectoryName("   ").error).toBe("请输入目录名称。");
  });

  it("counts Unicode code points for the 200-character limit", () => {
    expect(validateDirectoryName("研".repeat(200)).error).toBeNull();
    expect(validateDirectoryName("研".repeat(201)).error).toBe(
      "目录名称不能超过 200 个字符。",
    );
  });
});
