import { describe, expect, it } from "vitest";

import { calculateFileFingerprint } from "./file-fingerprint";

describe("calculateFileFingerprint", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["本地文本\nrevision", "405723498b55a60fd436fe43ed07e4ce597f88589c6d004246365c66260a1179"],
  ])("hashes raw UTF-8 bytes: %s", async (content, expected) => {
    const bytes = new TextEncoder().encode(content);
    const file = { arrayBuffer: async () => bytes.buffer } as File;
    await expect(calculateFileFingerprint(file)).resolves.toBe(expected);
  });

  it("hashes binary document bytes without text conversion", async () => {
    const bytes = new Uint8Array([0, 255, 1, 128]);
    const file = { arrayBuffer: async () => bytes.buffer } as File;

    await expect(calculateFileFingerprint(file)).resolves.toBe(
      "edc81f7e4ee358fb91e94bd9bd74079c3dcba36f40f2c8a36e7ae0567afecc8f",
    );
  });

  it("stops before reading when already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = { arrayBuffer: async () => new ArrayBuffer(0) } as File;
    await expect(calculateFileFingerprint(file, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
