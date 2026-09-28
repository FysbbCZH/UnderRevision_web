<!-- SPEC_BASELINE_START -->
# Spec 基线

- 同步时间：2026-09-26T20:02:00+08:00
- 状态：已完成

| Spec 路径 | SHA-256 |
|---|---|
| `specs/spec.md` | `1cef1cb0cd1820a694274e0c6564587ed11a1b93fee6507f7c825a655bca6320` |
| `specs/board/spec.md` | `910eb780b0b6dfc97e32591b211fba844c34b65aa79e71141f9848c7a1298e8e` |
| `specs/board/item/spec.md` | `83e5ff03677ca597927f73ad73458564fe87cfaa9b72bb6ddff3f82972f1a0be` |
<!-- SPEC_BASELINE_END -->

# Item 文档格式扩展 Plan

## 1. 范围与状态

- 目标项目：`UnderRevision_web`。后端 `UnderRevision` 仅作为当前公开合同的只读证据，不进入本 Plan 的 Spec 基线。
- 当前状态：待工程师审核；尚未获得基于本次 Spec 基线的编码批准。
- 目标：在现有 Item 文件上传闭环上增加 PDF、DOC、DOCX，继续支持 UTF-8 文本，并让上传提示、列表说明、下载合同校验和真实后端集成验收与当前后端实现一致。
- 保留：现有 Item 树、查询、改名、移动、分类、删除、revision/ETag、结果未知恢复和目录删除联动行为。
- 非目标：不增加预览、在线编辑、内容解析、格式转换、病毒扫描、批量上传、分片上传或新的后端接口；不修改后端项目。
- 历史状态：旧 Item Plan、其批准和 `20260925-040014-item-management.task.md` 已因本次前端 Spec 变化失效，编码阶段必须生成新的 Task 批次，不能继续旧批次。

## 2. 实际读取的 Spec

| Spec | 约束关系 |
|---|---|
| `specs/spec.md` | 前端技术边界、Chrome 必须支持、状态可观察性、模块化与注释规范 |
| `specs/board/spec.md` | Board/Item 模块边界、共享 `{API_BASE_URL}`、错误与数据一致性要求 |
| `specs/board/item/spec.md` | 支持格式、上传提示、multipart、下载头部、错误处理与真实集成验收 |

已知但未读取的 `specs/board/spec.directory.md` 只约束目录 CRUD；本次不改变目录合同或级联删除联动，因此不纳入基线。项目中没有其他与文档格式扩展直接相关的 Spec。

## 3. 合同复核与冲突结论

### 3.1 前端 Spec

- 三份适用 Spec 可以同时满足，未发现语义冲突。
- Board 上层 Spec 把文件交互委托给 Item 子模块；Item Spec 将原“仅 UTF-8 文本”扩展为 UTF-8 文本、PDF、DOC、DOCX，不再与上层范围限制冲突。
- 根 Spec 的可观察与可取消要求继续由现有 `hashing/submitting/success/failure/result_unknown` 状态承担。

### 3.2 当前后端实现证据

- 上传入口仍为 `POST /api/v1/boards/{board_id}/items/files`，multipart 字段及 201 ItemResponse + ETag 合同不变。
- 后端按文件名后缀（不区分大小写）将 `.pdf`、`.doc`、`.docx` 识别为二进制文档；其他后缀或无后缀文件按 UTF-8 文本处理。
- PDF、DOC、DOCX 分别校验 `%PDF-`、OLE Compound File 和 ZIP Local File Header 文件头；客户端自报 MIME 不参与可信格式判定。
- 下载仍使用原文件名，并分别返回 `application/pdf`、`application/msword`、`application/vnd.openxmlformats-officedocument.wordprocessingml.document` 或 `text/plain; charset=utf-8`，同时包含 Content-Length。
- 后端保留 SHA-256、字节数和服务端大小上限校验；前端无需新增请求字段或格式枚举字段。

### 3.3 未决问题

- 无阻塞性未决问题。支持范围、扩展名、格式判定、上传接口和下载媒体类型均已由最新 Spec 与后端实现明确。

## 4. 设计与模块边界

### 4.1 上传界面

- 将工作区主入口、对话框标题、字段标签、空状态和校验提示从“文本文件”改为“文件”或“文本、PDF、Word 文档”。
- 文件选择器继续只允许单文件，并提示文本类型以及 `.pdf`、`.doc`、`.docx`；后缀匹配不区分大小写由浏览器和后端共同处理。
- 不在前端解析 PDF/Word，也不信任 `File.type` 断言格式有效；选中文件后仍以原始字节计算 SHA-256，通过原有 multipart 请求提交，由后端作最终格式判断。
- 后端返回 `INVALID_ITEM_FILE_REQUEST` 时保留文件、Item 名称、目录和类别输入，让用户重新选择或修正。

### 4.2 Item 展示

- ItemResponse 没有原文件名、大小或文档格式字段，因此列表来源说明统一改为“本地文件”。
- 不依据 Item 名称后缀猜测格式，不新增 PDF/Word 图标或筛选器，避免展示后端未返回的事实。

### 4.3 下载合同

- 下载继续以服务端 `Content-Disposition filename*` 作为保存文件名，并对危险字符做现有安全替换。
- Item API 下载边界增加响应合同校验：必须存在可用文件名、非负十进制 Content-Length，并且 Blob 字节数与 Content-Length 一致。
- 根据服务端文件名后缀校验 Content-Type：`.pdf`、`.doc`、`.docx` 对应后端约定媒体类型，其余文件接受 `text/plain; charset=utf-8`；不使用上传时的 `File.type` 覆盖下载响应。
- 合同不合规时不触发保存，按现有 contract error 展示下载失败，Item 仍保持可见。

### 4.4 领域与职责

- `UploadItemModal` 只负责单文件选择、可见提示和 Item 元数据收集，不承担文档解析。
- `file-fingerprint` 继续只对原始字节计算 SHA-256，新增二进制样本锁定其与编码无关。
- `item-api` 负责 HTTP 头部和 Blob 合同校验；UI 组件不得直接读取响应头或调用 fetch。
- `ItemWorkspace` 与 `ItemList` 只更新可见文案，不引入格式状态或跨模块依赖。
- 新增或修改的公共帮助函数、组件职责和重要合同分支使用清晰中文注释，方法不超过 140 行。

## 5. 自主设计项

1. **【自主设计】文件选择器使用 `text/*`、现有常见文本扩展名及 `.pdf,.doc,.docx` 的 accept 提示。** 理由：覆盖现有文本体验并明确暴露新增格式；accept 只是浏览器提示，用户仍可能绕过，后端保持最终判断。可随支持格式变化局部调整。
2. **【自主设计】前端不复制文件头校验。** 理由：后端已经按流式字节执行唯一可信校验，前端复制会产生规则漂移且无法带来安全保证；替代方案是客户端预检，但当前无必要。
3. **【自主设计】下载时以 `Content-Disposition` 文件名决定期望 Content-Type，并用 Blob 大小复核 Content-Length。** 理由：Item 响应不含格式字段，服务端文件名是现有唯一格式依据；若未来响应增加显式格式字段，可在 API 层替换该判定而不影响组件。
4. **【自主设计】真实集成测试使用最小有效文件头加确定性字节构造 PDF、DOC、DOCX 样本，并故意提供不可信 MIME。** 理由：精确覆盖当前后端合同、无需提交大型二进制夹具；替代方案是完整办公文档夹具，但会扩大仓库体积且不增加当前签名合同覆盖。

## 6. 实施步骤与验证

### 步骤 1：编码前基线复核

- 使用基线校验脚本复核本 Plan 的三份 Spec 路径与 SHA-256；任何变化都停止编码并回到 Plan 同步。
- 只读复核后端格式映射、上传路由和下载响应头仍与第 3.2 节一致。
- 记录并保护当前工作树中已有修改，不覆盖无关 Board/Directory 工作。

验证：基线一致，后端合同无漂移，生成新的 Task 批次。

### 步骤 2：上传与展示文案

- 修改 `UploadItemModal` 的类/方法注释、空文件错误、标题、字段标签和 `accept` 提示。
- 修改 `ItemWorkspace` 上传入口和 `ItemList` 空状态、来源说明。
- 更新依赖旧可访问名称或旧文案的组件测试与真实集成定位器。

验证：组件测试确认“上传文件”入口可访问、选择器包含文本/PDF/DOC/DOCX 提示、ALL 类别互斥及既有上传状态不回归。

### 步骤 3：下载响应合同

- 在 Item API 层集中解析并校验 Content-Disposition、Content-Length 和 Content-Type。
- 保持现有安全文件名清洗、Blob 下载和错误分类；合同错误不得触发浏览器保存。
- 补充文本、PDF、DOC、DOCX 成功响应，以及缺失/错误长度、错误媒体类型和非法文件名的单元测试。

验证：四种格式均产生正确 `ItemDownload`；不合规 200 响应被识别为 contract error。

### 步骤 4：二进制指纹与上传回归

- 为 `file-fingerprint` 增加包含 NUL 和高位字节的二进制样本，确认按原始字节计算而非文本编码。
- 扩展 multipart API 测试，确认 PDF/Word File 对象仍原样进入 FormData，不额外发送 MIME 或格式字段。

验证：文本和二进制 SHA-256 均为 64 位小写十六进制；原 multipart 字段集合不变。

### 步骤 5：真实后端集成

- 扩展现有隔离 FastAPI + Vite + Chrome 流程，上传 UTF-8 文本、PDF、DOC、DOCX。
- 对新增三种格式使用确定性二进制样本，校验创建成功、树中可见、下载原始字节一致、服务端文件名和 Content-Type 正确。
- 至少一个二进制样本使用与扩展名不匹配的自报 MIME，验证前端不会阻止且后端按文件内容与扩展名裁决。
- 保留现有改名、移动、分类、目录级联删除和独立 Item 删除闭环。

验证：真实浏览器请求不使用 mock，临时 DATA_ROOT 隔离且运行结束清理。

### 步骤 6：最终回归

- 运行聚焦 Vitest、完整 `npm run check`、现有 mock Chrome E2E、真实 `npm run test:integration` 和 `git diff --check`。
- 最终再次复核 Spec 基线并检查只改动本 Task 所需文件。

验证：静态检查、类型检查、单元/组件、构建、mock E2E 和真实集成全部通过；若环境问题阻止某项，明确报告未验证项而不宣称完成。

## 7. Spec 追踪

| Spec 要求 | 实现落点 | 验证 |
|---|---|---|
| 文本、PDF、DOC、DOCX 可选择上传 | `UploadItemModal` | accept/文案组件测试 + 真实上传 |
| 后端是格式最终判断者 | 上传 UI 与现有 `item-api` | 不做 MIME/文件头客户端拦截 |
| 原始字节 SHA-256 | `file-fingerprint` | 文本与二进制向量测试 |
| Item 不伪造格式 | `ItemList` | 统一“本地文件”展示 |
| 下载头部合规后才保存 | `item-api` | 四格式及错误头部单测 |
| PDF/Word 原始字节闭环 | `tests/integration/items.spec.ts` | FastAPI + Chrome 无 mock 验收 |
| 状态与结果未知规则不回归 | `use-item-mutations`、组件 | 现有测试与完整回归 |

## 8. 风险与回退

- **浏览器内存：** Web Crypto 仍需读取完整文件；前端不虚构服务端大小上限。若后端未来显著提高上限，应单独设计增量 hash/worker，不在本次加塞。
- **扩展名与内容不符：** accept 不能防止绕过；后端错误必须原样进入现有可读错误路径，前端不得把选择成功当成格式有效。
- **DOCX 只是 ZIP 容器：** 当前合同仅校验既定文件头，不在前端引入完整 Office 解析；未来后端加强校验时，前端无需改协议。
- **下载头部漂移：** 严格校验可能暴露代理或后端错误配置；应报告合同错误，不静默降级为错误扩展名文件。
- **回退：** UI 文案/accept、下载校验和新增测试均可按步骤独立回退；现有 Item CRUD 数据模型与接口路径不变，不需要数据迁移。

## 9. 审核记录

- 2026-09-26：后端实现已新增 PDF、DOC、DOCX 文件头校验与按格式下载 Content-Type；前端 Spec 随之从仅文本扩展为文档文件。
- 2026-09-26：旧 Item Plan、旧批准和旧 Task 批次因 Spec 实质变化失效，本 Plan 以新基线重新进入审核。
- 当前审核状态：**待审核，未获得编码批准。**
