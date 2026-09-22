import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { MutationStatus } from "../api/types";

interface DeleteBoardModalProps {
  open: boolean;
  boardName: string;
  status: MutationStatus;
  requestError?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * 把不可恢复删除与普通编辑隔离，且不通过 Enter 表单提交。
 */
export function DeleteBoardModal({
  open,
  boardName,
  status,
  requestError,
  onClose,
  onConfirm,
}: DeleteBoardModalProps) {
  const busy = status === "submitting";

  return (
    <Modal
      open={open}
      title={`删除“${boardName}”`}
      description="删除成功后无法恢复，请先确认目标 Board。"
      tone="danger"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            取消，保留 Board
          </button>
          <button
            className="button button--danger"
            type="button"
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? "正在删除…" : "确认删除"}
          </button>
        </>
      }
    >
      <p>
        当前仅允许删除除唯一根目录外不含其他目录或业务内容的空 Board。
        非空 Board 会被服务端拒绝，不会发生部分删除。
      </p>
      {requestError ? (
        <Feedback title="删除未完成" tone="error">
          {requestError}
        </Feedback>
      ) : null}
    </Modal>
  );
}
