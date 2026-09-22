import { useId, useState, type FormEvent } from "react";

import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { MutationStatus } from "../api/types";
import { validateBoardName } from "../model/validate-board-name";
import styles from "./BoardFormModal.module.css";

interface BoardFormModalProps {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  initialName?: string;
  status: MutationStatus;
  requestError?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

/**
 * 创建和重命名共用的 Board 名称表单。
 */
export function BoardFormModal({
  open,
  title,
  description,
  submitLabel,
  initialName = "",
  status,
  requestError,
  onClose,
  onSubmit,
}: BoardFormModalProps) {
  const [name, setName] = useState(initialName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const generatedId = useId().replaceAll(":", "");
  const formId = `board-form-${generatedId}`;
  const inputId = `board-name-${generatedId}`;
  const busy = status === "submitting";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateBoardName(name);
    setValidationError(validation.error);

    if (validation.error) {
      return;
    }

    await onSubmit(validation.value);
  };

  return (
    <Modal
      open={open}
      title={title}
      description={description}
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
            取消
          </button>
          <button
            className="button button--primary"
            type="submit"
            form={formId}
            disabled={busy}
          >
            {busy ? "正在提交…" : submitLabel}
          </button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor={inputId}>Board 名称</label>
        <input
          id={inputId}
          name="board_name"
          value={name}
          autoFocus
          aria-invalid={Boolean(validationError || requestError)}
          aria-describedby={
            validationError || requestError ? `${inputId}-error` : undefined
          }
          disabled={busy}
          onChange={(event) => {
            setName(event.target.value);
            setValidationError(null);
          }}
        />
        <p className={styles.hint}>1–200 个字符，允许与已有 Board 同名。</p>
        {validationError || requestError ? (
          <div id={`${inputId}-error`}>
            <Feedback title="无法提交" tone="error">
              {validationError ?? requestError}
            </Feedback>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
