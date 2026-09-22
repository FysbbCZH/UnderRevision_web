export interface DirectoryNameValidation {
  value: string;
  error: string | null;
}

/** 校验目录名称，并返回可直接发送的 trim 后值。 */
export function validateDirectoryName(name: string): DirectoryNameValidation {
  const value = name.trim();
  const length = Array.from(value).length;

  if (length === 0) {
    return { value, error: "请输入目录名称。" };
  }
  if (length > 200) {
    return { value, error: "目录名称不能超过 200 个字符。" };
  }
  return { value, error: null };
}
