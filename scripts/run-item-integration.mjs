import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendRoot = resolve(
  process.env.UNDERREVISION_BACKEND_ROOT ?? join(frontendRoot, "..", "UnderRevision"),
);
const frontendPort = parsePort(process.env.ITEM_INTEGRATION_FRONTEND_PORT, 43183);
const backendPort = parsePort(process.env.ITEM_INTEGRATION_BACKEND_PORT, 48123);
const backendPython = resolve(
  process.env.UNDERREVISION_BACKEND_PYTHON ?? join(backendRoot, ".venv", "bin", "python"),
);
const dataRoot = await mkdtemp(join(tmpdir(), "underrevision-item-integration-"));
let backend;
let stopping = false;
let backendLog = "";

process.once("SIGINT", () => void stopFromSignal(130));
process.once("SIGTERM", () => void stopFromSignal(143));

try {
  await validateEnvironment();
  await ensurePortAvailable(frontendPort, "前端");
  await ensurePortAvailable(backendPort, "后端");
  backend = startBackend();
  await waitForBackend();
  const status = await runPlaywright();
  if (status !== 0) {
    printBackendLog();
    process.exitCode = status;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  printBackendLog();
  process.exitCode = 1;
} finally {
  await cleanup();
}

async function validateEnvironment() {
  await access(join(backendRoot, "pyproject.toml"));
  await access(join(backendRoot, "config.yaml"));
  await access(backendPython);
  await access(join(frontendRoot, "node_modules", "@playwright", "test", "cli.js"));
}

function startBackend() {
  const child = spawn(
    backendPython,
    ["-m", "uvicorn", "underrevision.app:create_app", "--factory", "--host", "127.0.0.1", "--port", String(backendPort)],
    {
      cwd: backendRoot,
      env: {
        ...process.env,
        DATA_ROOT: join(dataRoot, "data"),
        PYTHONPATH: join(backendRoot, "src"),
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", appendBackendLog);
  child.stderr.on("data", appendBackendLog);
  return child;
}

async function waitForBackend() {
  const deadline = Date.now() + 30_000;
  const requiredPaths = [
    "/api/v1/boards/{board_id}/items/files",
    "/api/v1/boards/{board_id}/items/tree",
    "/api/v1/boards/{board_id}/items/{item_id}",
    "/api/v1/boards/{board_id}/items/{item_id}/content",
  ];
  while (Date.now() < deadline) {
    if (backend?.exitCode !== null) throw new Error(`真实后端提前退出，状态码 ${backend.exitCode}。`);
    try {
      const response = await fetch(`http://127.0.0.1:${backendPort}/openapi.json`);
      if (response.ok) {
        const document = await response.json();
        const paths = document?.paths ?? {};
        if (!requiredPaths.every((path) => Object.hasOwn(paths, path))) {
          throw new Error("真实后端 OpenAPI 缺少获批的 Item 路由。");
        }
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("OpenAPI 缺少")) throw error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error("等待真实后端就绪超时。");
}

function runPlaywright() {
  return new Promise((resolveStatus, rejectStatus) => {
    const child = spawn(
      process.execPath,
      [join(frontendRoot, "node_modules", "@playwright", "test", "cli.js"), "test", "-c", "playwright.integration.config.ts"],
      {
        cwd: frontendRoot,
        env: {
          ...process.env,
          ITEM_INTEGRATION_FRONTEND_PORT: String(frontendPort),
          ITEM_INTEGRATION_BACKEND_PORT: String(backendPort),
          ITEM_INTEGRATION_NODE_PATH: process.execPath,
        },
        stdio: "inherit",
      },
    );
    child.once("error", rejectStatus);
    child.once("exit", (code, signal) => {
      if (signal) rejectStatus(new Error(`Playwright 被信号 ${signal} 中止。`));
      else resolveStatus(code ?? 1);
    });
  });
}

async function cleanup() {
  if (stopping) return;
  stopping = true;
  if (backend && backend.exitCode === null) {
    backend.kill("SIGTERM");
    await Promise.race([
      new Promise((resolveExit) => backend.once("exit", resolveExit)),
      new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000)),
    ]);
    if (backend.exitCode === null) backend.kill("SIGKILL");
  }
  await rm(dataRoot, { recursive: true, force: true });
}

async function stopFromSignal(status) {
  await cleanup();
  process.exit(status);
}

function ensurePortAvailable(port, label) {
  return new Promise((resolveAvailable, rejectAvailable) => {
    const server = createServer();
    server.once("error", () => rejectAvailable(new Error(`${label}集成端口 ${port} 已被占用。`)));
    server.listen(port, "127.0.0.1", () => server.close(resolveAvailable));
  });
}

function parsePort(value, fallback) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1024 || parsed > 65535) {
    throw new Error(`无效的集成测试端口：${value}`);
  }
  return parsed;
}

function appendBackendLog(chunk) {
  backendLog = `${backendLog}${String(chunk)}`.slice(-20_000);
}

function printBackendLog() {
  if (backendLog.trim()) console.error(`\n--- 真实后端最近日志 ---\n${backendLog}`);
}
