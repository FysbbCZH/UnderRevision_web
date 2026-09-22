import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { MutationStatus } from "../api/types";

interface DeleteDirectoryModalProps {
  open: boolean;
  directoryName: string;
  status: MutationStatus;
  requestError?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** 隔离不可恢复的目录递归删除，且不使用 Enter 表单提交。 */
export function DeleteDirectoryModal({
  open,
  directoryName,
  status,
  requestError,
  onClose,
  onConfirm,
}: DeleteDirectoryModalProps) {
  const busy = status === "submitting";
  return (
    <Modal
      open={open}
      title={`删除“${directoryName}”`}
      description="删除成功后无法恢复，请确认目录范围。"
      tone="danger"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button className="button" type="button" disabled={busy} onClick={onClose}>
            取消，保留目录
          </button>
          <button
            className="button button--danger"
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "正在删除…" : "确认删除目录"}
          </button>
        </>
      }
    >
      <p>该目录及其全部子目录都会被递归删除，前端不会提前移除任何节点。</p>
      {requestError ? (
        <Feedback title="删除未完成" tone="error">
          {requestError}
        </Feedback>
      ) : null}
    </Modal>
  );
}
