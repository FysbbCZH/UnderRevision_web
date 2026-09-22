<!-- SPEC_BASELINE_START -->
# Spec 基线

- 同步时间：2026-09-22T20:42:16+08:00
- 状态：已完成

| Spec 路径 | SHA-256 |
|---|---|
| `specs/spec.md` | `1cef1cb0cd1820a694274e0c6564587ed11a1b93fee6507f7c825a655bca6320` |
| `specs/board/spec.md` | `64465e03279e4121158ed1ac77454322d81ebef3858379f98b87259660a425d6` |
| `specs/board/spec.directory.md` | `535b5625025ddbcb44eb534323c510d5424805b8a7ab0bc6a87c4bc5d52db316` |
<!-- SPEC_BASELINE_END -->

# Board 目录管理前端实施 Plan

## 1. 当前结论与状态

- **可执行性：前端可实现。** 最新前端 Spec 已明确目录树、创建、单项查询、重命名、移动、递归删除、根目录透明、错误恢复和响应式交互，可以形成可审核的实现闭环。
- **本次范围：只实现目录及必要的 Board 契约对齐。** Item、文件、分类、知识、产物和 Agent 任务均不实现。
- **现有基础：可复用。** 项目已有 React 19、TypeScript、Vite、React Router、CSS Modules、Vitest、Testing Library、MSW、Playwright，以及已完成的 Board CRUD 页面、API 校验、结果未知处理、Modal 和 Feedback 组件。
- **现有前端必须修正。** `BoardResponse`、运行时校验、详情元数据、组件测试和 E2E mock 仍包含 `root_directory_id`；最新 Spec 要求根目录完全透明，实施时必须移除展示与前端状态中的该字段。
- **后端真实联调尚未就绪。** 当前后端代码只有 Board CRUD，尚无 Directory 路由，且 Board API 仍返回 `root_directory_id`；相邻后端 Directory Plan 描述了目标接口，但其基线状态与正文审核记录不一致。前端可以按本项目 Spec 使用 MSW 完成实现和自动化验收，真实联调必须等待后端按同一合同落地后再确认。
- **当前状态：待工程师审核，禁止编码。** 工程师明确批准本 Plan 后，才移交 `dev-by-spec-coding` 复核基线、创建新的 Task 批次并实施。
- 原 `.agents/tasks/20260922-125215-board-frontend.task.md` 对应旧 Spec 与旧 Plan，只能作为已完成历史记录；其“当前有效批次”标记已因本次 Spec 变化失效，本阶段不修改旧 Task。

## 2. 本次范围与非目标

### 2.1 目标

1. 将 Board 前端响应合同收敛为 `board_id/board_name/creator_id`，移除根目录 ID 的展示和状态依赖。
2. 在 Board 详情页加入目录工作区，展示完整非根目录树和服务端顺序。
3. 支持创建顶层目录、创建子目录、重命名、显式选择目标父目录移动、递归删除。
4. 实现五个 Directory 接口、递归响应校验、Board 归属校验、树结构校验和统一错误处理。
5. 正确处理加载、刷新、空树、失败、结果未知、Board/Directory 不存在和业务冲突。
6. 保证目录树和操作区在桌面与窄屏下可用，展开、选择、危险状态和错误不只依赖颜色。
7. 用 API、纯模型、组件和 Chrome E2E 测试验证主要流程及高风险失败分支。

### 2.2 非目标

- 不修改后端项目、后端 Spec、后端 Plan 或后端实现。
- 不实现 Item、文件上传下载、文件浏览、分类、知识、产物或 Agent 任务。
- 不实现拖拽移动、目录搜索、分页、批量操作、复制、排序写入、软删除、回收站或恢复。
- 不实现登录、鉴权、用户切换或权限界面。
- 不增加前端状态管理、树组件、表单或校验第三方依赖。
- 不把目录树持久化到浏览器缓存，不提供离线写入。
- 不修改 `specs/`；编码阶段若合同变化，必须停止并返回 Plan 同步。

## 3. 实际读取的前端 Spec 与作用

| Spec | 与本任务的关系 |
|---|---|
| `specs/spec.md` | TypeScript/HTML/CSS、Chrome 支持、状态可观察性、父子 Spec 一致性和注释规范 |
| `specs/board/spec.md` | Board 详情页、共享状态/错误合同、`API_BASE_URL`、Board 响应及根目录透明联动 |
| `specs/board/spec.directory.md` | 目录页面行为、五个接口、数据模型、恢复行为、可用性和范围限制 |

已知但未读取的前端 Spec 分支：无。当前前端项目只有根 Spec、Board 主 Spec 和 Directory 子 Spec，三者均直接影响本次修改。

后端 `specs/board/spec.directory.md`、`specs/board/spec.models.md`、Directory Plan 与当前 Board 实现仅用于交叉核对外部合同和识别联调差异，不进入本前端 Plan 的 Spec 基线。

## 4. 冲突与缺口检查

### 4.1 冲突结论

- 未发现三份适用前端 Spec 之间的语义冲突。
- 根 Spec 的异步任务可观察性要求不强迫同步 Directory CRUD 伪装成后台任务；Directory Spec 已要求同步请求仍提供进行中、失败和结果未知反馈，两者可以同时满足。
- Board 主 Spec 与 Directory 子 Spec 都要求根目录透明，Board 响应移除 `root_directory_id`、目录树隐藏根节点且顶层使用 `parent_id: null`，语义一致。
- Board 模块的五个基础接口与 Directory 模块的五个目录接口边界明确，不互相替代。

### 4.2 外部合同差异

- 当前后端实现仍返回 `root_directory_id`，而前端最新合同不再使用该字段。
- 当前后端实现尚无 `/api/v1/boards/{board_id}/directories` 路由。
- 相邻后端 Plan 给出的 Directory 字段、路径、状态码和错误码与前端 Directory Spec 一致，可作为 mock 合同来源；真实联调时必须重新读取后端实际 OpenAPI/响应并验证，不得只凭 Plan 宣称成功。

这些差异不阻塞前端独立实现与 mock 验收，但阻塞真实全链路验收。若后端最终合同与当前前端 Spec 不一致，停止联调并回到 Spec/Plan 流程，不在适配层私自改名或兼容两套业务语义。

## 5. 页面与交互实现设计

### 5.1 Board 详情页组合

- 保持路由 `/boards/:boardId` 不变；Board 基础信息、目录工作区和危险区在同一详情页纵向组合。
- Board 详情加载成功后挂载目录工作区；Board 详情为 404 时不发起或终止目录请求。
- 目录工作区自身管理查询与变更状态，避免把 Directory 状态继续堆入已经负责 Board 重命名/删除的页面组件。
- Board 危险区保持在页面末尾，使目录常规操作与删除整个 Board 明确分离。

### 5.2 目录工作区

- 工作区头部展示标题、递归目录总数、刷新状态、手动刷新和“新建顶层目录”。
- 主体采用目录树与当前目录操作区双栏；窄屏改为纵向，操作区位于树后。
- 没有选中项时展示选择提示；不自动选中第一项。
- 创建、重命名和删除复用现有 Modal/Feedback 语义；移动使用独立目标选择对话框。
- `Modal` 增加可选的语义标题或 kicker 输入，默认行为保持 Board 现状，Directory 对话框不错误显示“Board 管理”。

### 5.3 目录树

- 使用递归组件渲染后端树，不引入第三方 Tree 控件。
- 节点的展开按钮和选择按钮分离；叶节点不展示无意义的展开按钮。
- `selectedDirectoryId` 与 `expandedDirectoryIds` 只属于当前页面会话，不写入 localStorage。
- 刷新后通过 `dir_id` 重新关联选择与展开状态；不存在的 ID 被清理，并在选择失效时展示数据变化提示。
- 树的业务数据保持服务端顺序；派生索引只用于查找父节点、后代和递归计数，不改变数组顺序。

### 5.4 创建与重命名

- 一个内聚的目录名称表单组件承载名称输入、1～200 字符校验、提交状态和服务端错误。
- 创建入口显式传入 `parent_id`：顶层为 `null`，子目录为选中目录 ID；对话框只读展示目标位置。
- 创建收到合规 201 后记录已确认的新目录 ID，再刷新整树；刷新成功后选中新目录，刷新失败时保留成功反馈并标记树可能过期。
- 重命名只发送 `dir_name`，收到合规 200 后再更新已确认状态并刷新树。

### 5.5 移动

- 移动目标对话框以现有已确认树生成候选：Board 顶层、以及除当前目录和其全部后代以外的目录。
- 当前父级保留为只读现状但不允许提交无变化请求。
- PATCH 只发送 `parent_id`；收到合规 200 后再刷新整树和恢复选中项。
- 客户端候选过滤只是交互保护；409 `DIRECTORY_CYCLE` 和 `DIRECTORY_DEPTH_EXCEEDED` 仍按服务端最终判断展示。

### 5.6 删除与结果未知恢复

- 删除对话框展示目录名称和递归删除子目录警告，使用危险语义；普通 Enter 不直接确认。
- 只有 204 才从页面确认删除；随后刷新整树并清理被删除子树内的选择与展开 ID。
- 创建、重命名或移动结果未知时，用户触发整树重新查询；前端展示服务端现状，不推断请求是否执行。
- 删除结果未知时，用户触发单项 GET：`404 DIRECTORY_NOT_FOUND` 视为删除已确认，再刷新整树；200 表示目录仍存在；核对失败则继续保持结果未知。

## 6. 模块与数据边界

```text
src/
├── features/
│   ├── boards/
│   │   ├── api/
│   │   └── components/
│   └── directories/
│       ├── api/
│       │   ├── types.ts
│       │   ├── validators.ts
│       │   ├── directory-api.ts
│       │   └── directory-api.test.ts
│       ├── model/
│       │   ├── directory-tree.ts
│       │   ├── directory-tree.test.ts
│       │   ├── validate-directory-name.ts
│       │   └── use-directory-tree.ts
│       └── components/
│           ├── DirectoryWorkspace.tsx
│           ├── DirectoryTree.tsx
│           ├── DirectoryTreeNode.tsx
│           ├── DirectoryNameModal.tsx
│           ├── MoveDirectoryModal.tsx
│           └── DeleteDirectoryModal.tsx
├── pages/BoardDetailsPage.tsx
└── shared/api/
    ├── api-error.ts
    └── http.ts
```

- Directory API 类型和运行时校验归目录模块；页面组件不解析未知 JSON。
- 目录树的索引、后代集合、递归计数和刷新后状态对齐使用纯函数，便于单测并避免 UI 组件承担领域判断。
- `use-directory-tree.ts` 负责查询生命周期、取消旧请求、已确认树、选择/展开对齐和结果未知核对；展示组件只接收显式数据与回调。
- BoardDetailsPage 只组合 Board 与 Directory 两个功能模块，不直接实现递归树、HTTP 或移动规则。
- 共享 API 层只抽取运行时配置、统一错误信封解析、网络/结果未知分类和状态码断言；Board 与 Directory 各自保留业务响应读取和错误文案。

### 6.1 运行时响应校验

- Board 响应校验只读取 `board_id/board_name/creator_id`，构造新的干净对象进入状态；即使过渡期后端多返回 `root_directory_id`，前端也不展示、缓存或传播该字段。
- Directory 单项响应验证五个字段类型，并验证 `board_id` 等于当前路由 Board。
- Directory 树递归验证每个节点、`children` 数组、全树 `dir_id` 唯一、顶层 `parent_id === null`、子节点 `parent_id` 等于直接父节点 ID、所有节点属于当前 Board。
- 任一节点不合规时拒绝整棵响应，不展示部分树。
- 客户端不重新排序、不修复孤儿、不猜测父级；合同错误使用持续反馈并保留最后一次已确认树。

## 7. 自主设计项

1. **【自主设计】目录工作区嵌入现有 Board 详情路由。** 无需新增深链接和路由状态，最符合“进入 Board 后管理目录”；未来若目录详情需要独立分享，可增加子路由而不改变 API 模块。
2. **【自主设计】桌面双栏、窄屏纵向布局。** 目录树优先、操作区辅助，复用现有页面宽度和设计 token；替代方案是三栏文件管理器，但会提前引入 Item/File 空区域。
3. **【自主设计】使用递归 React 组件与纯函数索引，不引入树组件依赖。** 当前只处理目录，现有技术栈足够；若未来节点数量或虚拟滚动需求出现，再单独评估。
4. **【自主设计】移动使用显式对话框，不实现拖拽。** 能清晰排除自身/后代并适配键盘与窄屏，且与 Spec 的显式选择要求一致；以后可在不改接口的前提下增加拖拽入口。
5. **【自主设计】选择与展开状态仅保存在组件内存。** 刷新按 ID 对齐，不写 URL 或浏览器缓存；替代方案可在未来需要深链接时加入查询参数。
6. **【自主设计】抽取最小共享 HTTP 基础能力。** Board 与 Directory 都需要相同的错误信封、网络分类和结果未知语义；只抽协议通用部分，不建立通用 Repository、缓存层或状态框架。
7. **【自主设计】成功响应映射为声明字段的干净对象。** 既保证根目录 ID 不进入前端状态，也避免过渡期后端多余字段阻塞 Board 页面；缺字段、错类型、错误 Board 归属和错误树关系仍严格拒绝。
8. **【自主设计】创建成功后刷新树并选中新目录，重命名/移动后刷新并保持选择。** API 返回负责确认操作，整树刷新负责恢复服务端顺序和父子结构；刷新失败不撤销已确认成功，而是标记可能过期。
9. **【自主设计】目录总数按当前合规树递归计算。** 后端合同没有单独 `total`，因此不新增请求或伪造服务端总数；它只是当前树的派生展示。
10. **【自主设计】后端未就绪期间以 MSW 完成合同测试和 Chrome E2E。** mock 结果不能替代真实联调；后端可用后必须另做同合同 smoke test 才能声明全链路完成。

## 8. 分步骤实施与验证

### 步骤 1：编码前基线与现状复核

- 用 `verify_spec_baseline.py` 复核三份前端 Spec 的路径和摘要；不一致则停止并回到 Plan 同步。
- 运行 `npm run check` 和现有 Board E2E，记录实施前基线。
- 确认后端当前 Directory 路由与 Board 响应现状，仅用于记录联调差异，不修改后端。
- 保护现有 `.DS_Store` 和工程师无关改动，不纳入新 Task。

验证：基线一致；现有检查结果有记录；未修改 Spec 或后端。

### 步骤 2：对齐 Board 合同并抽取共享 HTTP 基础能力

- 从 Board 类型、校验、元数据组件、文案、单测和 E2E mock 移除 `root_directory_id` 依赖。
- Board 读取构造干净响应对象，不把未声明字段传播进状态。
- 抽取通用 API 错误、统一错误信封解析、基础 URL、网络分类和结果未知处理；Board 五个接口的状态码与行为保持不变。
- 为共享逻辑和 Board 回归补充测试，避免抽取改变现有错误消息、Abort 或 204 行为。

验证：Board CRUD 测试继续通过；页面不显示根目录 ID；过渡期多余字段不会进入 Board 状态；缺少必需字段仍按契约错误拒绝。

### 步骤 3：实现 Directory API 与树校验

- 定义 Directory 响应、树节点、树信封、创建和更新请求类型。
- 实现五个端点，逐一断言 200/201/204，并复用统一错误信封和结果未知分类。
- 实现带当前 `board_id` 的递归解析与结构不变量校验，不接受部分有效树。
- 覆盖服务端顺序、空树、非法字段、错误 Board、重复 ID、错误父关系、业务错误和网络中断。

验证：API 单测覆盖全部端点和关键合同错误；变更请求只发送允许字段且不自动重试。

### 步骤 4：实现目录树纯模型与状态 Hook

- 实现递归计数、ID 索引、父节点查找、后代集合、移动候选和刷新后选择/展开对齐纯函数。
- 实现名称 trim 与 1～200 Unicode 字符校验。
- 实现 `use-directory-tree` 的初始查询、手动刷新、请求取消、已确认状态、选择/展开和结果未知核对。
- Board 切换或组件卸载时取消旧查询，避免跨 Board 响应覆盖。

验证：纯函数测试覆盖空树、多层树、重复名称不同父级、后代排除、选择失效和服务端顺序保持；Hook 测试覆盖竞态与刷新失败保留旧树。

### 步骤 5：实现目录组件与 Board 详情集成

- 实现工作区、递归树节点、名称表单、移动目标和删除确认组件。
- 实现桌面双栏和窄屏纵向布局，复用现有 token、Modal、Feedback 和按钮语义。
- 在 Board 详情成功态中挂载目录工作区；Board 404/失败时不展示可操作目录界面。
- 增加创建、重命名、移动、删除、刷新、空树和业务错误交互。
- 为类/组件、Hook、纯函数和关键分支编写清晰中文注释；单个方法不超过 140 行，不通过压行规避。

验证：组件测试覆盖展开与选择分离、顶层/子目录创建、移动候选排除、非乐观更新、删除确认、结果未知恢复和响应式可访问名称。

### 步骤 6：Chrome E2E 与真实联调门禁

- 新增独立 Directory E2E mock，完成：进入 Board → 空树 → 创建多层目录 → 展开/选择 → 重命名 → 移动 → 递归删除。
- 覆盖同名冲突、防环、深度超限、Board/Directory 404、结果未知和窄屏无横向溢出。
- 运行 `npm run check` 与 `npm run test:e2e`。
- 若后端 Directory API 已落地，使用临时数据做同合同 smoke test；若未落地，只报告 mock 验收通过，不宣称真实联调成功。
- 最终再次复核 Spec 基线。

验证：静态检查、单元/组件、构建和 Chrome E2E 通过；真实联调状态有明确证据；Spec 基线仍一致。

## 9. Spec 追踪

| Spec 要求 | 实现落点 | 验收项 |
|---|---|---|
| 进入 Board 后管理目录 | BoardDetailsPage + DirectoryWorkspace | 路由 Board ID 驱动全部请求 |
| 根目录透明 | Board 映射 + Directory DTO/树 | 不展示/缓存根 ID，顶层 parent 为 null |
| 查询完整目录树 | Directory API + recursive tree | 空树、多层树、服务端顺序 |
| 创建顶层/子目录 | DirectoryNameModal + POST | 明确父级、201 后确认 |
| 重命名 | DirectoryNameModal + PATCH | 只发 dir_name，200 后更新 |
| 移动且排除自身/子孙 | MoveDirectoryModal + tree helpers | 候选过滤、409 保留原树 |
| 递归删除 | DeleteDirectoryModal + DELETE | 显式警告、204 后清理选择 |
| Board 资源验证 | API path + response validator | 每个请求带 board_id，响应归属一致 |
| 结果未知不可猜测 | shared API + hook reconciliation | 无自动重试，查询恢复实际状态 |
| 错误合同 | API error mapping + Feedback | 404/409/422/未知错误可读且安全 |
| 非乐观更新 | mutation orchestration | 成功响应前树不变 |
| 桌面/窄屏可用 | CSS Modules + accessible controls | 双栏转纵向、键盘可达、无横溢出 |
| 不实现 Item/File | 模块和测试范围 | 无 Item/File 类型、占位区或接口 |

## 10. 风险、破坏性变化与回退

- **Board 合同破坏性变化：** 前端移除 `root_directory_id`；当前后端仍返回该字段。前端通过干净对象映射避免展示和缓存，多余字段仅作为过渡兼容；真实合同仍应由后端移除。
- **后端未就绪风险：** mock 可以验证前端合同但不能证明真实服务可用。交付必须分别报告 mock 与真实联调状态。
- **树结构风险：** 递归响应可能存在重复 ID、错误父关系或跨 Board 节点。运行时校验必须整树拒绝，不能部分修复后展示。
- **深树渲染风险：** 最大深度 20，递归组件可控；仍需测试 20 层缩进、键盘访问和窄屏溢出，不提前引入虚拟列表。
- **状态竞态风险：** 刷新、变更和 Board 切换可能交错。每类请求使用 AbortController/当前 Board 身份保护，旧响应不得覆盖新上下文。
- **结果未知风险：** 查询恢复只能展示服务端现状，不能总能判断创建或移动请求的历史执行过程。文案必须说明实际状态而非伪造成功/失败。
- **共享 API 抽取回归风险：** 抽取范围限制在协议通用逻辑，Board 行为由现有测试锁定；若回归扩大，先恢复 Board 私有实现，再保留 Directory 独立客户端。
- **Modal 复用风险：** 改动共享组件可能影响 Board 对话框。新增属性必须有默认值，并回归焦点、Esc、遮罩和 busy 行为。
- **删除风险：** 删除目录不可恢复且影响整棵子树。前端不做乐观移除，确认界面明确范围，204 前保持树不变。
- **回退方式：** Directory 新模块和 BoardDetailsPage 挂载可作为独立批次撤销；Board 根字段调整与共享 API 抽取分批提交，失败时按批次恢复，不使用破坏性 Git 命令，不修改后端或浏览器持久数据。

## 11. 待工程师审核

- 本 Plan 没有待补充的前端 Spec 冲突或阻塞性设计问题。
- 请重点审核第 5 节页面交互、第 6 节模块拆分、第 7 节全部自主设计项，以及对当前后端未就绪状态的处理。
- 明确批准后，才可移交 `dev-by-spec-coding`；本次“制定编码 Plan”请求本身不等于批准编码。

## 12. 审核记录

- 2026-09-22：根据新增前端 Directory Spec 和 Board 根目录透明合同，废弃旧 Board-only Plan 基线，生成 Directory-only 增量实施 Plan。
- 2026-09-22：实际代码检查确认 Board CRUD 已完成、Directory 前端尚未实现；计划以现有 React/Vite 工程为基础，不重建项目。
- 当前审核状态：**待审核，未获得编码批准。**
