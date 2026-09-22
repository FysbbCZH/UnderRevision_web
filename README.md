# UnderRevision Web

UnderRevision 的浏览器前端。当前版本提供 Board 列表、创建、详情、重命名和删除空 Board 的完整界面。

## 开发环境

- Node.js `^22.12.0`、`^24.0.0` 或 `>=26.0.0`
- npm
- Chrome（端到端测试）

安装并启动：

```bash
npm install
npm run dev
```

常用验证命令：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## 运行时配置

页面会在应用脚本之前加载 `public/config.js`。部署环境可以替换该文件并注入后端基础地址：

```javascript
window.__UNDERREVISION_CONFIG__ = {
  API_BASE_URL: "https://api.example.com",
};
```

`API_BASE_URL` 未配置时默认使用页面同源地址。只允许 HTTP 或 HTTPS 地址，业务路径由前端统一追加。跨域部署时，需要由后端显式允许前端来源。

## 后端接口

前端只使用以下 Board 接口：

- `GET /api/v1/boards`
- `POST /api/v1/boards`
- `GET /api/v1/boards/{board_id}`
- `PATCH /api/v1/boards/{board_id}`
- `DELETE /api/v1/boards/{board_id}`

创建、重命名和删除不会自动重试。浏览器无法确认变更结果时，界面会要求用户先重新查询服务端状态。

## 部署

`npm run build` 输出到 `dist/`。应用使用浏览器 History 路由，静态托管服务必须把未知页面路径回退到 `index.html`，否则直接刷新 `/boards/{board_id}` 会得到托管层 404。

部署时应保留或替换 `dist/config.js`，不要把真实环境地址硬编码进源码。

## 测试边界

- Vitest、Testing Library 和 MSW 覆盖接口契约与组件交互。
- Playwright 使用本机 Chrome，并通过请求拦截验证关键浏览器流程。
- Mock 测试不等同于真实后端联调。后端接口可用后，仍需单独执行五个接口的联调冒烟。
