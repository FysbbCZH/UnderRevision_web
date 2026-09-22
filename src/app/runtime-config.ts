export interface RuntimeConfig {
  apiBaseUrl: string;
}

let currentConfig: RuntimeConfig | undefined;

/**
 * 读取部署时注入的配置，并把 API 地址规范化为不带尾部斜线的绝对地址。
 */
export function loadRuntimeConfig(): RuntimeConfig {
  const configuredValue = window.__UNDERREVISION_CONFIG__?.API_BASE_URL;
  const defaultValue = window.location.origin;

  if (
    configuredValue !== undefined &&
    (typeof configuredValue !== "string" || configuredValue.trim() === "")
  ) {
    throw new Error("API_BASE_URL 必须是非空字符串。");
  }

  const candidate =
    typeof configuredValue === "string" ? configuredValue.trim() : defaultValue;
  const url = new URL(candidate, defaultValue);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("API_BASE_URL 只支持 http 或 https 地址。");
  }

  currentConfig = {
    apiBaseUrl: url.toString().replace(/\/$/, ""),
  };

  return currentConfig;
}

/**
 * 返回已经通过校验的运行时配置。
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!currentConfig) {
    throw new Error("运行时配置尚未初始化。");
  }

  return currentConfig;
}
