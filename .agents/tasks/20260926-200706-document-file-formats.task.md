# Task 批次：扩展 Item 文档格式

- 创建时间：2026-09-26T20:07:06+08:00
- Plan：.agents/plans/board/item/plan.md
- Plan 内容 SHA-256：a6d7bd79f3914cc45ff9a78b3f89930410977295dfbe3fa147c3b7bac6b9208b
- Spec 基线复核：passed
- 基线复核时间：2026-09-26T20:07:06+08:00
- 当前有效批次：是

## T001 — 更新文件上传与列表界面

- 执行状态：done
- 任务目标：让界面明确支持文本、PDF、DOC 和 DOCX 文件
- 任务来源：Plan 4.1、4.2 与步骤 2，当前界面仍限定文本文件
- 涉及的文件：
  - src/features/items/components/UploadItemModal.tsx
  - src/features/items/components/ItemWorkspace.tsx
  - src/features/items/components/ItemList.tsx
  - src/features/items/components/ItemWorkspace.test.tsx

## T002 — 校验多格式下载响应

- 执行状态：done
- 任务目标：保存前校验文件名、长度和格式对应媒体类型
- 任务来源：Plan 4.3 与步骤 3，当前下载仅校验状态码
- 涉及的文件：
  - src/features/items/api/item-api.ts
  - src/features/items/api/item-api.test.ts

## T003 — 覆盖二进制指纹与 multipart

- 执行状态：done
- 任务目标：证明二进制文件按原始字节计算并原样进入 multipart
- 任务来源：Plan 步骤 4，现有测试只覆盖 UTF-8 文本
- 涉及的文件：
  - src/features/items/model/file-fingerprint.test.ts
  - src/features/items/api/item-api.test.ts

## T004 — 扩展真实后端文档集成验收

- 执行状态：done
- 任务目标：跑通文本、PDF、DOC、DOCX 的真实上传下载闭环
- 任务来源：Plan 步骤 5，现有真实集成只覆盖文本文件
- 涉及的文件：
  - tests/integration/items.spec.ts
