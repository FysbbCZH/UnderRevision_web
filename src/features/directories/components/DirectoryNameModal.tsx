import { useId, useState, type FormEvent } from "react";

import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { MutationStatus } from "../api/types";
import { validateDirectoryName } from "../model/validate-directory-name";
import styles from "./DirectoryModal.module.css";

interface DirectoryNameModalProps {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  locationLabel?: string;
  initialName?: string;
  status: MutationStatus;
  requestError?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

/** 创建和重命名共用的目录名称表单。 */
export function DirectoryNameModal({
  open,
  title,
  description,
  submitLabel,
  locationLabel,
  initialName = "",
  status,
  requestError,
  onClose,
  onSubmit,
}: DirectoryNameModalProps) {
  const [name, setName] = useState(initialName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const generatedId = useId().replaceAll(":", "");
  const formId = `directory-form-${generatedId}`;
  const inputId = `directory-name-${generatedId}`;
  const busy = status === "submitting";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateDirectoryName(name);
    setValidationError(validation.error);
    if (!validation.error) {
      await onSubmit(validation.value);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      description={description}
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
            disabled={busy}
          >
            {busy ? "正在提交…" : submitLabel}
          </button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit}>
        {locationLabel ? (
          <p className={styles.location}>
            目标位置：<strong>{locationLabel}</strong>
          </p>
        ) : null}
        <label htmlFor={inputId}>目录名称</label>
        <input
          id={inputId}
          name="dir_name"
          value={name}
          autoFocus
          disabled={busy}
          aria-invalid={Boolean(validationError || requestError)}
          aria-describedby={
            validationError || requestError ? `${inputId}-error` : undefined
          }
          onChange={(event) => {
            setName(event.target.value);
            setValidationError(null);
          }}
        />
        <p className={styles.hint}>1–200 个字符；同一位置不能与已有目录重名。</p>
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
