import { Link } from "react-router-dom";

import { Feedback } from "../shared/ui/Feedback";

/**
 * 未知前端路径的轻量恢复页。
 */
export function NotFoundPage() {
  return (
    <main className="page-frame">
      <p className="eyebrow">404 / Not found</p>
      <Feedback
        title="没有找到这个页面"
        tone="warning"
        actions={
          <Link className="button" to="/boards">
            返回 Board 工作台
          </Link>
        }
      >
        地址可能已经失效，或当前版本尚未提供对应功能。
      </Feedback>
    </main>
  );
}
