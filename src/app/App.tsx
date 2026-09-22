import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { BoardDetailsPage } from "../pages/BoardDetailsPage";
import { BoardsPage } from "../pages/BoardsPage";
import { NotFoundPage } from "../pages/NotFoundPage";

/**
 * 应用路由与全局工作台外壳。
 */
export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="site-header">
          <Link className="brand" to="/boards" aria-label="Under Revision 首页">
            <span className="brand__mark" aria-hidden="true">
              UR
            </span>
            <span>
              <strong>Under Revision</strong>
              <small>Research editorial workspace</small>
            </span>
          </Link>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/boards" replace />} />
          <Route path="/boards" element={<BoardsPage />} />
          <Route path="/boards/:boardId" element={<BoardDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
