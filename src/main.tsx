import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import { loadRuntimeConfig } from "./app/runtime-config";
import { Feedback } from "./shared/ui/Feedback";
import "./styles/tokens.css";
import "./styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("页面缺少应用挂载节点 #root。");
}

const root = createRoot(rootElement);

try {
  loadRuntimeConfig();
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  const message =
    error instanceof Error ? error.message : "运行时配置无法读取。";

  root.render(
    <main className="startup-error">
      <Feedback title="应用无法启动" tone="error">
        {message}
      </Feedback>
    </main>,
  );
}
