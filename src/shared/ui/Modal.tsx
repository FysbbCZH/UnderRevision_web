import { useEffect, useId, useRef, type PropsWithChildren } from "react";

import styles from "./Modal.module.css";

interface ModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  kicker?: string;
  busy?: boolean;
  onClose: () => void;
  footer: React.ReactNode;
  tone?: "default" | "danger";
}

/**
 * 提供统一的模态对话框行为，负责焦点、Esc 关闭和遮罩点击。
 */
export function Modal({
  open,
  title,
  description,
  kicker,
  busy = false,
  onClose,
  footer,
  tone = "default",
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-tone={tone}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) {
          onClose();
        }
      }}
      onClick={(event) => {
        // 只有直接点击原生 dialog 的遮罩区域才关闭，避免内容区冒泡误触。
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>
              {kicker ?? (tone === "danger" ? "危险操作" : "Board 管理")}
            </p>
            <h2 id={titleId}>{title}</h2>
            {description ? (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            ) : null}
          </div>
          <button
            className={styles.close}
            type="button"
            aria-label="关闭对话框"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className={styles.content}>{children}</div>
        <footer className={styles.footer}>{footer}</footer>
      </div>
    </dialog>
  );
}
