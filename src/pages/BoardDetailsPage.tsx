import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteBoard, updateBoardName } from "../features/boards/api/board-api";
import {
  BoardApiError,
  getBoardErrorMessage,
} from "../features/boards/api/errors";
import type { MutationStatus } from "../features/boards/api/types";
import { BoardFormModal } from "../features/boards/components/BoardFormModal";
import { BoardMetadata } from "../features/boards/components/BoardMetadata";
import { DeleteBoardModal } from "../features/boards/components/DeleteBoardModal";
import { useBoardDetails } from "../features/boards/model/use-board-details";
import { DirectoryWorkspace } from "../features/directories/components/DirectoryWorkspace";
import { Feedback } from "../shared/ui/Feedback";
import { NotFoundPage } from "./NotFoundPage";
import styles from "./BoardDetailsPage.module.css";

/**
 * Board 详情页，集中编排重命名与删除两类变更。
 */
export function BoardDetailsPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const {
    data,
    status,
    error,
    refresh,
    acceptConfirmedBoard,
  } = useBoardDetails(boardId ?? "");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameStatus, setRenameStatus] = useState<MutationStatus>("idle");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<MutationStatus>("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [detailsMayBeStale, setDetailsMayBeStale] = useState(false);

  if (!boardId) {
    return <NotFoundPage />;
  }

  const isNotFound =
    error instanceof BoardApiError && error.status === 404;

  const openRename = () => {
    setRenameStatus("idle");
    setRenameError(null);
    setRenameOpen(true);
  };

  const submitRename = async (boardName: string) => {
    setRenameStatus("submitting");
    setRenameError(null);

    try {
      const updatedBoard = await updateBoardName(boardId, {
        board_name: boardName,
      });
      acceptConfirmedBoard(updatedBoard);
      setRenameStatus("success");
      setRenameOpen(false);
      setSuccessMessage(`已将 Board 重命名为“${updatedBoard.board_name}”。`);
      const refreshed = await refresh();
      setDetailsMayBeStale(refreshed.status !== "success");
    } catch (requestError) {
      const isUnknown =
        requestError instanceof BoardApiError &&
        requestError.kind === "result_unknown";
      setRenameStatus(isUnknown ? "result_unknown" : "failure");
      setRenameError(getBoardErrorMessage(requestError));
      if (isUnknown) {
        setRenameOpen(false);
      }
    }
  };

  const confirmDelete = async () => {
    setDeleteStatus("submitting");
    setDeleteError(null);

    try {
      await deleteBoard(boardId);
      setDeleteStatus("success");
      navigate("/boards", {
        replace: true,
        state: { deletedBoardName: data?.board_name ?? "Board" },
      });
    } catch (requestError) {
      const isUnknown =
        requestError instanceof BoardApiError &&
        requestError.kind === "result_unknown";
      setDeleteStatus(isUnknown ? "result_unknown" : "failure");
      setDeleteError(getBoardErrorMessage(requestError));
      if (isUnknown) {
        setDeleteOpen(false);
      }
    }
  };

  const checkUnknownResult = async (operation: "rename" | "delete") => {
    const refreshed = await refresh();
    setDetailsMayBeStale(refreshed.status !== "success");

    // 删除结果未知后，详情 404 是可确认的最终状态：Board 已不再存在。
    if (
      operation === "delete" &&
      refreshed.status === "failure" &&
      refreshed.error instanceof BoardApiError &&
      refreshed.error.status === 404
    ) {
      navigate("/boards", {
        replace: true,
        state: { deletedBoardName: data?.board_name ?? "Board" },
      });
      return;
    }

    if (refreshed.status !== "success") {
      return;
    }

    if (operation === "rename") {
      setRenameStatus("idle");
      setRenameError(null);
    } else {
      setDeleteStatus("idle");
      setDeleteError(null);
    }
  };

  if (status === "loading" && !data) {
    return (
      <main className="page-frame">
        <p className="eyebrow">Board details</p>
        <div className={styles.loading} role="status">
          正在读取 Board 详情…
        </div>
      </main>
    );
  }

  if (isNotFound && !data) {
    return (
      <main className="page-frame">
        <Feedback
          title="Board 不存在"
          tone="warning"
          actions={
            <Link className="button" to="/boards">
              返回全部 Board
            </Link>
          }
        >
          该 Board 可能已经被删除，返回主界面可重新同步列表。
        </Feedback>
      </main>
    );
  }

  if (status === "failure" && !data) {
    return (
      <main className="page-frame">
        <Feedback
          title="无法读取 Board"
          tone="error"
          actions={
            <button className="button" type="button" onClick={() => void refresh()}>
              手动重试
            </button>
          }
        >
          {getBoardErrorMessage(error)}
        </Feedback>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="page-frame">
      <Link className={styles.back} to="/boards">
        <span aria-hidden="true">←</span>
        返回全部 Board
      </Link>

      {successMessage ? (
        <div className={styles.notice}>
          <Feedback
            title="修改已确认"
            tone={detailsMayBeStale ? "warning" : "success"}
          >
            {successMessage}
            {detailsMayBeStale
              ? " 但详情重新读取失败，页面可能不是最新状态。"
              : ""}
          </Feedback>
        </div>
      ) : null}

      {renameStatus === "result_unknown" ? (
        <div className={styles.notice}>
          <Feedback
            title="重命名结果暂时未知"
            tone="warning"
            actions={
              <button
                className="button"
                type="button"
                onClick={() => void checkUnknownResult("rename")}
              >
                重新查询详情
              </button>
            }
          >
            {renameError}
          </Feedback>
        </div>
      ) : null}

      {deleteStatus === "result_unknown" ? (
        <div className={styles.notice}>
          <Feedback
            title="删除结果暂时未知"
            tone="warning"
            actions={
              <button
                className="button"
                type="button"
                onClick={() => void checkUnknownResult("delete")}
              >
                重新查询详情
              </button>
            }
          >
            {deleteError}
          </Feedback>
        </div>
      ) : null}

      <article className={styles.sheet}>
        <header className={styles.heading}>
          <div>
            <p className="eyebrow">Board details</p>
            <h1>{data.board_name}</h1>
            <p>Board 的标识信息由服务端维护，仅名称允许修改。</p>
          </div>
          <button className="button" type="button" onClick={openRename}>
            重命名
          </button>
        </header>

        <section aria-labelledby="metadata-title">
          <h2 id="metadata-title" className={styles.sectionTitle}>
            基本信息
          </h2>
          <BoardMetadata board={data} />
        </section>

        <DirectoryWorkspace boardId={boardId} />

        <section className={styles.danger} aria-labelledby="danger-title">
          <div>
            <p className={styles.dangerLabel}>Danger zone</p>
            <h2 id="danger-title">删除这个 Board</h2>
            <p>
              仅空 Board 可以删除。服务端会拒绝非空 Board，且不会部分清理数据。
            </p>
          </div>
          <button
            className="button button--danger"
            type="button"
            onClick={() => {
              setDeleteStatus("idle");
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            删除 Board
          </button>
        </section>
      </article>

      {renameOpen ? (
        <BoardFormModal
          open
          title="重命名 Board"
          description="Board ID 和创建人不会改变。"
          submitLabel="保存新名称"
          initialName={data.board_name}
          status={renameStatus}
          requestError={renameError}
          onClose={() => setRenameOpen(false)}
          onSubmit={submitRename}
        />
      ) : null}

      {deleteOpen ? (
        <DeleteBoardModal
          open
          boardName={data.board_name}
          status={deleteStatus}
          requestError={deleteError}
          onClose={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </main>
  );
}
