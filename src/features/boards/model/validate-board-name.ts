export interface BoardNameValidation {
  value: string;
  error: string | null;
}

/**
 * 按前后端共同契约校验 Board 名称，并返回可直接发送的 trim 后值。
 */
export function validateBoardName(name: string): BoardNameValidation {
  const value = name.trim();
  const length = Array.from(value).length;

  if (length === 0) {
    return { value, error: "请输入 Board 名称。" };
  }

  if (length > 200) {
    return { value, error: "Board 名称不能超过 200 个字符。" };
  }

  return { value, error: null };
}
