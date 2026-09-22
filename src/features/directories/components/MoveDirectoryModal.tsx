import { useId, useMemo, useState, type FormEvent } from "react";

import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { DirectoryTreeNode, MutationStatus } from "../api/types";
import { findDirectory, getMoveTargets } from "../model/directory-tree";
import styles from "./DirectoryModal.module.css";

const TOP_LEVEL_VALUE = "__board_top_level__";

interface MoveDirectoryModalProps {
  open: boolean;
  directory: DirectoryTreeNode;
  directories: DirectoryTreeNode[];
  status: MutationStatus;
  requestError?: string | null;
  onClose: () => void;
  onSubmit: (parentId: string | null) => Promise<void>;
}

/** 通过明确目标选择移动目录，避免拖拽和树选择语义冲突。 */
export function MoveDirectoryModal({
  open,
  directory,
  directories,
  status,
  requestError,
  onClose,
  onSubmit,
}: MoveDirectoryModalProps) {
  const currentValue = directory.parent_id ?? TOP_LEVEL_VALUE;
  const [targetValue, setTargetValue] = useState(currentValue);
  const formId = `move-directory-${useId().replaceAll(":", "")}`;
  const busy = status === "submitting";
  const targets = useMemo(
    () => getMoveTargets(directories, directory.dir_id),
    [directories, directory.dir_id],
  );
  const currentParent = findDirectory(directories, directory.parent_id);
  const unchanged = targetValue === currentValue;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!unchanged) {
      await onSubmit(targetValue === TOP_LEVEL_VALUE ? null : targetValue);
    }
  };

  return (
    <Modal
      open={open}
      title={`移动“${directory.dir_name}”`}
      description={`当前位置：${currentParent?.dir_name ?? "Board 顶层"}`}
      kicker="目录管理"
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button className="button" type="button" disabled={busy} onClick={onClose}>
            取消
          </button>
          <button
            className="button button--primary"
            type="submit"
            form={formId}
            disabled={busy || unchanged}
          >
            {busy ? "正在移动…" : "确认移动"}
          </button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor={`${formId}-target`}>目标位置</label>
        <select
          id={`${formId}-target`}
          value={targetValue}
          disabled={busy}
          onChange={(event) => setTargetValue(event.target.value)}
        >
          <option value={TOP_LEVEL_VALUE}>Board 顶层</option>
          {targets.map(({ directory: target, depth }) => (
            <option key={target.dir_id} value={target.dir_id}>
              {`${"— ".repeat(depth)}${target.dir_name}`}
            </option>
          ))}
        </select>
        <p className={styles.hint}>当前目录及其子目录不会作为移动目标。</p>
        {unchanged ? <p className={styles.note}>请选择不同于当前位置的目标。</p> : null}
        {requestError ? (
          <Feedback title="移动未完成" tone="error">
            {requestError}
          </Feedback>
        ) : null}
      </form>
    </Modal>
  );
}
