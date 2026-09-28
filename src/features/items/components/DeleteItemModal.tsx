import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { MutationStatus } from "../api/types";
import styles from "./ItemModal.module.css";

interface DeleteItemModalProps {
  itemName: string;
  status: MutationStatus;
  requestError: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** 危险删除不用表单，避免普通 Enter 直接确认。 */
export function DeleteItemModal(props: DeleteItemModalProps) {
  const busy = props.status === "submitting";
  return (
    <Modal
      open title={`删除“${props.itemName}”`} tone="danger" busy={busy}
      description="删除当前 Board 中的 Item 后无法恢复。"
      onClose={props.onClose}
      footer={
        <>
          <button className="button" type="button" disabled={busy} onClick={props.onClose}>取消，保留 Item</button>
          <button className="button button--danger" type="button" disabled={busy} onClick={() => void props.onConfirm()}>
            {busy ? "正在删除…" : "确认删除 Item"}
          </button>
        </>
      }
    >
      <p className={styles.warning}>物理文件可能因其他 Item 引用或后端宽限期继续存在。</p>
      {props.requestError ? <Feedback title="删除未完成" tone="error">{props.requestError}</Feedback> : null}
    </Modal>
  );
}
