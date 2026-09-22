import type { PropsWithChildren } from "react";

import styles from "./Feedback.module.css";

type FeedbackTone = "info" | "success" | "warning" | "error";

interface FeedbackProps extends PropsWithChildren {
  title: string;
  tone?: FeedbackTone;
  actions?: React.ReactNode;
}

/**
 * 展示需要被用户感知的页面状态，并用文本而非仅颜色表达语义。
 */
export function Feedback({
  title,
  tone = "info",
  actions,
  children,
}: FeedbackProps) {
  const liveRole = tone === "error" ? "alert" : "status";

  return (
    <section className={styles.feedback} data-tone={tone} role={liveRole}>
      <div>
        <strong className={styles.title}>{title}</strong>
        <div className={styles.body}>{children}</div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  );
}
