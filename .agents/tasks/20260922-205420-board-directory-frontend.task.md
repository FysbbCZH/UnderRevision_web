# Task 批次：Board 目录前端

- 创建时间：2026-09-22T20:54:20+08:00
- Plan：.agents/plans/board/plan.md
- Plan 内容 SHA-256：645118271b9bed695d4f0d8ef277db9dfa3efe4c41d422be772a9fff97dbdcb1
- Spec 基线复核：passed
- 基线复核时间：2026-09-22T20:54:20+08:00
- 当前有效批次：是

## T001 — 对齐 Board 合同与共享 HTTP 边界

- 执行状态：done
- 任务目标：移除根目录字段依赖并抽取最小共享请求能力
- 任务来源：Plan 步骤 2；现有 Board 响应仍保存并展示根目录 ID
- 涉及的文件：
  - src/shared/api/api-error.ts
  - src/shared/api/http.ts
  - src/features/boards/api/types.ts
  - src/features/boards/api/validators.ts
  - src/features/boards/api/errors.ts
  - src/features/boards/api/board-api.ts
  - src/features/boards/api/board-api.test.ts
  - src/features/boards/components/BoardMetadata.tsx
  - src/pages/BoardsPage.test.tsx
  - src/pages/BoardDetailsPage.tsx
  - src/pages/BoardDetailsPage.test.tsx
  - tests/e2e/boards.spec.ts

## T002 — 实现 Directory API 与树模型

- 执行状态：done
- 任务目标：实现五个目录接口、递归合同校验和纯树操作
- 任务来源：Plan 步骤 3、4；项目当前没有 Directory 功能模块
- 涉及的文件：
  - src/features/directories/api/types.ts
  - src/features/directories/api/validators.ts
  - src/features/directories/api/directory-api.ts
  - src/features/directories/api/directory-api.test.ts
  - src/features/directories/model/directory-tree.ts
  - src/features/directories/model/directory-tree.test.ts
  - src/features/directories/model/validate-directory-name.ts
  - src/features/directories/model/validate-directory-name.test.ts

## T003 — 实现 Directory 查询与恢复状态

- 执行状态：done
- 任务目标：管理目录树查询、选择展开、变更和结果未知恢复
- 任务来源：Plan 步骤 4；请求竞态与恢复逻辑需独立于页面组件
- 涉及的文件：
  - src/features/directories/model/use-directory-tree.ts
  - src/features/directories/model/use-directory-tree.test.tsx

## T004 — 实现目录工作区与 Board 详情集成

- 执行状态：done
- 任务目标：完成目录树、操作对话框、响应式布局与页面集成
- 任务来源：Plan 步骤 5；复用现有 Modal 与 Feedback 设计语言
- 涉及的文件：
  - src/shared/ui/Modal.tsx
  - src/features/directories/components/DirectoryWorkspace.tsx
  - src/features/directories/components/DirectoryWorkspace.module.css
  - src/features/directories/components/DirectoryWorkspace.test.tsx
  - src/features/directories/components/DirectoryTree.tsx
  - src/features/directories/components/DirectoryTreeNode.tsx
  - src/features/directories/components/DirectoryNameModal.tsx
  - src/features/directories/components/DirectoryModal.module.css
  - src/features/directories/components/MoveDirectoryModal.tsx
  - src/features/directories/components/DeleteDirectoryModal.tsx
  - src/pages/BoardDetailsPage.tsx
  - src/pages/BoardDetailsPage.module.css
  - src/pages/BoardDetailsPage.test.tsx

## T005 — 完成 Chrome 目录流程验收

- 执行状态：done
- 任务目标：验证目录完整流程、失败恢复与窄屏可用性
- 任务来源：Plan 步骤 6；mock 验收与真实后端联调必须分开报告
- 涉及的文件：
  - tests/e2e/directories.spec.ts
