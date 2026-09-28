/**
 * 计算文件原始字节的 SHA-256。Web Crypto 本身不可中断，因此在读前和摘要后检查取消。
 */
export async function calculateFileFingerprint(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  throwIfAborted(signal);
  const bytes = await file.arrayBuffer();
  throwIfAborted(signal);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  throwIfAborted(signal);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("指纹计算已取消。", "AbortError");
}
