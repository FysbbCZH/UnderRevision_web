# Board Item 管理前端设计

## 目标

- 在用户进入 Board 后，以目录结构浏览并管理该 Board 中的 ACTIVE Item。
- 支持上传本地 UTF-8 文本、PDF 和 Word 文档创建 Item，以及 Item 的查询、改名、移动、分类修改、下载和永久删除。
- 前端只通过后端 Item 接口使用文件能力，不暴露或虚构独立 File、Snip、object key 或对象存储操作。
- 通过真实后端集成测试验证 Item 管理闭环，不能只以 mock 测试代替前后端合同验收。

## 配置项

- 本 Spec 不新增运行时配置项；Item 请求沿用上层 Board 规范定义的 `{API_BASE_URL}`。

## 详细设计

### 功能范围

用户必须先进入一个已存在的 Board，才能管理该 Board 的 Item。本阶段提供：

1. 按 Board 顶层和非根目录浏览 ACTIVE Item。
2. 选择一个本地 UTF-8 文本、PDF 或 Word 文档，通过一次请求上传文件并创建 Item。
3. 查询单个 Item。
4. 修改 Item 名称、所属目录和所属类别。
5. 下载 Item 对应的文件内容。
6. 永久删除 Item。

文件内容不可修改或替换。Item 删除后不提供恢复入口；文件实体是否被其他 Item 复用及何时物理清理由后端维护，前端不得推断或直接控制。

### 页面与导航

#### Board 详情中的内容区域

Board 详情页在基本信息之后提供同级的“资料”和“目录设置”视图：

- “资料”承载 Item 浏览、上传和管理，是进入内容区域后的默认视图。
- “目录设置”承载 `spec.directory.md` 已定义的目录创建、重命名、移动和删除。
- 切换视图不改变当前 Board，不把内部根目录作为可见节点。
- 删除目录成功后，“资料”视图必须重新读取 Item 树，避免继续展示已随目录删除的 Item。

视图切换控件必须有明确的可访问名称和当前状态，不得只靠颜色表示选中项。

#### Item 工作区

Item 工作区包含：

- 标题、当前 Item 总数、刷新状态、“上传文件”入口和手动刷新入口。
- 目录导航：固定的“Board 顶层”入口，以及服务端返回的非根目录树。
- 当前目录的 Item 列表和空状态。
- 当前选中 Item 的信息与操作区。
- 首次加载、刷新中、加载失败、Board 不存在和数据合同错误状态。

首次进入时选择“Board 顶层”并展示 `root_items`。选择目录时只展示该目录直属的 `items`，不把子目录 Item 混入当前列表；子目录通过目录导航显式进入。

目录与 Item 的同层顺序完全采用服务端返回顺序，前端不得自行排序。Item 列表至少展示 Item 名称、类别和“本地文件”来源说明；后端没有在 Item 响应中提供文件名、文件大小或文档格式，前端不得伪造这些信息。

没有 Item 时应展示可理解的空状态，并提供向当前目录上传文件的入口。刷新失败时保留最后一次已确认的 Item 树，并明确提示数据可能不是最新状态。

#### 桌面与窄屏布局

- 常见桌面宽度下采用“目录导航 + Item 列表 + Item 操作区”的三段式布局，Item 列表是主区域。
- 较窄窗口下依次排列目录导航、Item 列表和操作区，不产生阻止核心操作的横向滚动。
- 长名称允许换行或安全截断并提供完整可访问名称，不能挤压选择、下载或编辑入口。
- 当前目录、当前 Item、危险操作和错误状态不得只通过颜色表达。

### 上传本地文件

#### 上传界面

上传使用独立对话框或抽屉，包含：

- 单个本地文件选择控件。
- Item 名称输入；选择文件后可以文件名作为初始值，但用户可以修改，Item 名称与物理文件名是两个概念。
- 目标位置；默认使用打开上传界面时的当前目录，也可在 Board 顶层和活动目录中重新选择。
- 类别选择；`ALL` 与其他类别互斥，未选择具体类别时使用 `ALL`。
- 创建、取消操作，以及可读的校验和请求错误。

当前接受后端能够验证的 UTF-8 文本、PDF、DOC 和 DOCX 文档。后端按文件名扩展名（不区分大小写）识别 `.pdf`、`.doc` 和 `.docx`，校验对应文件头并忽略客户端自报 MIME；其他扩展名或无扩展名文件仍按 UTF-8 文本校验。文件选择器必须提示文本、PDF、DOC 和 DOCX，但扩展名或 MIME 只能作为辅助，后端格式与完整性校验仍是最终判断；前端不得仅凭扩展名或 MIME 宣称文件有效。

#### 上传阶段

上传过程至少区分并展示：

1. 正在计算 SHA-256。
2. 正在上传并创建 Item。
3. 已确认创建、失败或结果未知。

前端使用文件原始字节计算 64 位小写 SHA-256，以 `File.size` 作为字节数，并通过 `multipart/form-data` 一次提交文件和 Item 元数据。不得手工设置 multipart 的 `Content-Type` 边界。

计算指纹期间取消属于本地取消；请求发出后的中断只能标记为结果未知，因为后端可能已经完成对象写入和 Item 创建。上传创建不得自动重试。

只有收到 `201 Created`、合规 `ItemResponse` 且响应属于当前 Board 时，才能确认创建成功。成功后关闭上传界面、刷新 Item 树并选中新 Item；刷新失败时保留已确认创建结果并提示树可能过期。

### Item 浏览与操作

#### 选择和查询

- Item 树响应只包含 ACTIVE Item；前端不得展示或恢复 PENDING、REVOKE 或 DELETE Item。
- 选择 Item 后展示名称、类别、Item ID、创建人 ID 和所在位置；内部 Snip 和 `extra_params` 不作为普通用户操作入口。
- 需要重新确认单项状态时，使用 Item 单项查询；`404 ITEM_NOT_FOUND` 表示 Item 已删除、不存在或不属于当前 Board。

#### 修改元数据

编辑界面允许同时或分别修改名称、目录和类别：

- Item 名称提交前去除首尾空白，长度为 1 至 255 个 Unicode 字符。
- 目标目录使用 `null` 表示 Board 顶层，或使用当前 Item 树中活动目录的 `dir_id`；不提供手工输入 ID。
- 类别只能是 `ALL`、`REFERENCE`、`TEMPLATE`、`DATA`、`SOURCE`、`PRODUCT`；列表不能为空、自动去重，且 `ALL` 不能与其他类别共存。
- PATCH 只发送实际修改的字段，至少包含一项变化，并使用当前 Item `revision` 构造强 `If-Match`。

只有收到 `200 OK` 和合规 `ItemResponse` 后才更新已确认状态。`409 ITEM_REVISION_CONFLICT` 时不得覆盖服务端数据，应刷新 Item 树并要求用户基于最新内容重新编辑。

#### 下载

- 下载入口只对已确认的 ACTIVE Item 可用。
- 下载请求返回成功文件响应后，使用服务端 `Content-Disposition` 文件名触发浏览器保存；不得根据 Item 名称伪造物理文件名。
- 下载响应的 `Content-Type` 由服务端按原文件名确定：PDF 为 `application/pdf`，DOC 为 `application/msword`，DOCX 为 `application/vnd.openxmlformats-officedocument.wordprocessingml.document`，其他文件为 `text/plain; charset=utf-8`；前端不得用客户端选择文件时的 MIME 覆盖服务端结果。
- 下载失败保持 Item 可见，并展示可读错误；`409 FILE_OBJECT_UNAVAILABLE` 或 `SNIP_NOT_ACTIVE` 不得伪装为 Item 已删除。

#### 删除

删除确认必须展示 Item 名称，并说明：

- 删除不可恢复。
- 删除的是当前 Board 中的 Item；物理文件可能因其他 Item 仍在引用或后端宽限期而继续存在。
- 普通 Enter 不得直接确认危险操作。

删除请求使用当前 Item `revision` 构造强 `If-Match`。只有收到 `204 No Content` 后才从已确认树中移除 Item；失败或 revision 冲突时保留原 Item。

### 页面状态与结果恢复

Item 查询和变更沿用 Board 主规范的 `QueryStatus` 与 `MutationStatus`，并满足：

- 树查询、上传创建、修改、下载和删除分别管理状态，一个操作的错误不得覆盖其他操作。
- 同一变更处于 `submitting` 时阻止重复提交。
- 不使用乐观更新，不自动重试变更请求。
- Board 切换或组件卸载时取消不再需要的查询；旧 Board 响应不得覆盖当前 Board。
- 上传创建结果未知时刷新 Item 树并展示服务端现状。由于名称允许重复且后端没有请求幂等键，前端不得声称能够唯一确认本次创建；用户检查后才能决定是否重新上传，并应提示重复创建 Item 的可能性。
- 修改结果未知时重新查询单项和 Item 树，展示服务端当前值，不根据请求意图猜测是否成功。
- 删除结果未知时查询单项：`404 ITEM_NOT_FOUND` 可确认 Item 已不存在，`200` 表示仍存在；核对失败则继续保持结果未知。
- 目录删除成功后刷新 Directory 树和 Item 树；任一刷新失败时保留仍然有效的已确认信息并明确标记可能过期。

### 接口数据契约

#### Item 与类别

```typescript
type BoardCategory =
  | "ALL"
  | "REFERENCE"
  | "TEMPLATE"
  | "DATA"
  | "SOURCE"
  | "PRODUCT";

interface ItemResponse {
  item_id: string;
  item_name: string;
  item_source_type: "SNIP";
  item_source_id: string;
  item_category: BoardCategory[];
  directory_id: string | null;
  board_id: string;
  creator_id: string;
  status: "ACTIVE";
  revision: string;
  extra_params: Record<string, unknown> | null;
}
```

Item 位于 Board 顶层时 `directory_id` 必须为 `null`；响应不得暴露内部根目录 ID。`item_category` 必须非空、去重，且 `ALL` 与其他值互斥。

#### Item 目录树

```typescript
interface ItemDirectoryTreeNode {
  dir_id: string;
  dir_name: string;
  parent_id: string | null;
  board_id: string;
  creator_id: string;
  items: ItemResponse[];
  children: ItemDirectoryTreeNode[];
}

interface ItemDirectoryTreeResponse {
  root_items: ItemResponse[];
  directories: ItemDirectoryTreeNode[];
}
```

`directories` 不包含后端根目录；顶层目录的 `parent_id` 为 `null`。每个 Item 只能出现在与其 `directory_id` 对应的位置，根级 Item 只能出现在 `root_items`。响应中目录 ID 和 Item ID 必须分别全树唯一，所有节点与 Item 必须属于当前 Board；任一结构不合规时拒绝整棵响应。

#### 修改请求

```typescript
interface UpdateItemRequest {
  item_name?: string;
  directory_id?: string | null;
  categories?: BoardCategory[];
}
```

创建本地文件 Item 使用 `FormData`，字段为 `file`、`item_name`、`finger_print`、`size`，以及可选的 `directory_id` 和一个或多个同名 `categories`。顶层目录省略 `directory_id`；默认类别可省略 `categories`，由后端设为 `ALL`。

错误响应沿用 Board 主规范的 `ErrorResponse`。前端只展示合规的可读 `message`，不得显示原始 HTML、堆栈、SQL、对象存储路径或其他内部信息。

### 接口交互

统一 Item 前缀为 `{API_BASE_URL}/api/v1/boards/{board_id}/items`。

#### 上传文件并创建 Item

- 向 `{Item前缀}/files` 发送 `POST multipart/form-data`。
- 只有 `201 Created` 表示创建成功；响应为 `ItemResponse`，并返回与 `revision` 对应的强 `ETag`。
- 不调用 `POST {Item前缀}`，不调用独立 `/files`、`/snips`、prepare、content PUT 或 Snip 状态接口。

#### 查询 Item 树

- 向 `{Item前缀}/tree` 发送 `GET`。
- 只有 `200 OK` 且响应满足 `ItemDirectoryTreeResponse` 时更新已确认树。

#### 查询单个 Item

- 向 `{Item前缀}/{item_id}` 发送 `GET`。
- 只有 `200 OK` 且响应满足 `ItemResponse` 时更新单项状态。

#### 修改 Item

- 向 `{Item前缀}/{item_id}` 发送 `PATCH application/json`，并携带当前强 `If-Match`。
- 只有 `200 OK` 和合规 `ItemResponse` 才确认修改成功。

#### 下载 Item 内容

- 向 `{Item前缀}/{item_id}/content` 发送 `GET`。
- 只有 `200 OK` 且 `Content-Disposition`、`Content-Length` 与格式对应 `Content-Type` 合规的文件响应才触发保存；错误响应按统一错误信封处理。

#### 删除 Item

- 向 `{Item前缀}/{item_id}` 发送 `DELETE`，并携带当前强 `If-Match`。
- 只有 `204 No Content` 才确认删除成功。

#### 业务错误

- `404 BOARD_NOT_FOUND`：当前 Board 已不存在或不可见，停止 Item 操作并提供返回入口。
- `404 ITEM_NOT_FOUND`：Item 已不存在、已删除或不属于当前 Board，提示刷新 Item 树。
- `404 DIRECTORY_NOT_FOUND`：目标目录不存在、已删除或不属于当前 Board，保留输入并刷新目录数据。
- `409 ITEM_REVISION_CONFLICT`：Item 已被其他操作修改，刷新后重新编辑或删除。
- `409 SNIP_NOT_ACTIVE`：Item 对应文件当前不可用，保留 Item 并允许稍后重试查询或下载。
- `409 FILE_OBJECT_UNAVAILABLE`：文件对象缺失或完整性异常，保留 Item 并提示文件暂不可下载。
- `422 FILE_INTEGRITY_MISMATCH`：上传内容与声明大小或 SHA-256 不一致，保留用户选择并要求重新选择或重新计算。
- `422 INVALID_ITEM_FILE_REQUEST`：Item、类别、文件名、文本编码、PDF/Word 文件头或修改字段不合法，保留可修改输入。
- `422 INVALID_REQUEST`：multipart、请求字段或 `If-Match` 缺失/格式错误，展示通用请求校验提示。
- 未识别错误按通用失败处理，不泄漏内部信息。

### 可用性与浏览器行为

- Chrome 必须能够完成真实后端的上传、查询、改名、移动、分类修改、下载和删除闭环；Safari、Firefox 为可选支持。
- 文件选择、类别选择、目录导航、Item 列表、对话框和操作按钮必须具有可识别名称并可通过键盘到达。
- 上传阶段使用文本说明，不能只显示动画；失败和结果未知反馈持续到用户关闭、修改输入或主动核对。
- 用户提供的 Item 名称、文件名和后端错误消息均作为文本展示，不得作为 HTML 注入页面。

### 集成验收

真实后端集成测试必须使用隔离的临时 `DATA_ROOT`，启动实际 FastAPI 服务和前端开发/预览服务，通过浏览器完成：

1. 创建 Board 和多层目录。
2. 在 Board 顶层上传 UTF-8 文本并创建默认 `ALL` Item。
3. 分别上传 PDF、DOC 和 DOCX，验证原始字节、下载文件名及服务端返回的格式对应 `Content-Type`。
4. 在指定目录上传 Item，并验证 Item 树位置与分类。
5. 修改名称、移动目录和修改多个非 `ALL` 类别，验证 revision 更新与刷新后状态。
6. 下载文件并验证内容及服务端文件名。
7. 删除包含 Item 的目录，验证目录和其中 Item 都从查询中消失。
8. 删除独立 Item，并验证单项查询和下载均不再可用。

集成测试不得拦截或模拟上述 API，不得读取或污染真实业务数据库和对象目录。mock 合同测试可继续用于错误分支和组件隔离，但不能作为真实集成通过的证据。

## 约束

### 前后端契约一致性

- 只能调用本 Spec 定义的六个 Item 接口；文件能力必须位于 Item 命名空间，不得调用或新增独立 File、Snip、object key 或对象存储接口。
- 前端发送和接收的字段、multipart 名称、状态码、`ETag`/`If-Match` 及错误结构必须与本 Spec 一致。
- 服务端是 Board/Directory 归属、Item 状态、revision、类别、文件完整性及文档格式合法性的最终判断者。

### 数据一致性

- 上传、修改和删除不得并发重复提交、自动重试或在成功响应前进行乐观更新。
- 结果未知时必须查询服务端状态并如实展示；无法唯一核对创建结果时必须明确说明，不得猜测。
- Item 树刷新失败时保留最后一次已确认树；成功响应结构不合规时不得部分接纳。
- 目录删除影响 Item 时，Directory 与 Item 两个模块必须在成功响应后共同失效并重新查询。

### 根目录透明

- 前端不得展示、缓存、请求、编辑或发送后端根目录 ID。
- “Board 顶层”使用创建时省略 `directory_id`、修改时发送 `directory_id: null` 表达，不伪造根目录节点。

### 范围限制

- 不实现文件内容预览、在线编辑、替换、版本、恢复、回收站或直接物理删除。
- 不实现 Item 搜索、分页、排序设置、批量上传、批量移动、批量分类或批量删除。
- 不实现拖拽上传或拖拽移动；文件选择和目录移动使用显式控件。
- 不展示或操作内部 Snip 状态、object key、对象存储位置和维护任务。
- 不把 Item、文件内容或目录树持久化到浏览器缓存以替代服务端查询。
