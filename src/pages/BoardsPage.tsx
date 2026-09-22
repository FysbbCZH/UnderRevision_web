import { useState } from "react";
import { useLocation } from "react-router-dom";

import { BoardApiError, getBoardErrorMessage } from "../features/boards/api/errors";
import { createBoard } from "../features/boards/api/board-api";
import type {
  BoardResponse,
  MutationStatus,
} from "../features/boards/api/types";
import { BoardCard } from "../features/boards/components/BoardCard";
import { BoardFormModal } from "../features/boards/components/BoardFormModal";
import { useBoardList } from "../features/boards/model/use-board-list";
import { Feedback } from "../shared/ui/Feedback";
import styles from "./BoardsPage.module.css";

/**
 * Board 主界面，编排服务端列表与创建流程。
 */
export function BoardsPage() {
  const location = useLocation();
  const navigationState = location.state as
    | { deletedBoardName?: string }
    | null;
  const { data, status, error, refresh } = useBoardList();
  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<MutationStatus>("idle");
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmedBoard, setConfirmedBoard] = useState<BoardResponse | null>(
    null,
  );
  const [listMayBeStale, setListMayBeStale] = useState(false);

  const openCreate = () => {
    setCreateStatus("idle");
    setCreateError(null);
    setCreateOpen(true);
  };

  const submitCreate = async (boardName: string) => {
    setCreateStatus("submitting");
    setCreateError(null);

    try {
      const createdBoard = await createBoard({ board_name: boardName });
      setConfirmedBoard(createdBoard);
      setCreateStatus("success");
      setCreateOpen(false);

      const refreshed = await refresh();
      setListMayBeStale(!refreshed);
    } catch (requestError) {
      const isUnknown =
        requestError instanceof BoardApiError &&
        requestError.kind === "result_unknown";
      setCreateStatus(isUnknown ? "result_unknown" : "failure");
      setCreateError(getBoardErrorMessage(requestError));

      // 未知结果必须先回到列表核对，避免用户在表单内直接重复提交。
      if (isUnknown) {
        setCreateOpen(false);
      }
    }
  };

  const checkUnknownResult = async () => {
    const refreshed = await refresh();
    setListMayBeStale(!refreshed);
    if (refreshed) {
      setCreateStatus("idle");
      setCreateError(null);
    }
  };

  const isInitialLoading = status === "loading" && !data;
  const isInitialFailure = status === "failure" && !data;

  return (
    <main className="page-frame">
      <section className={styles.hero}>
        <div>
          <p className="eyebrow">Research workspace</p>
          <h1>Board 工作台</h1>
          <p className="page-intro">
            为每一次评审与修改建立清晰边界，从这里进入你的研究项目。
          </p>
        </div>
        <button className="button button--primary" type="button" onClick={openCreate}>
          <span aria-hidden="true">＋</span>
          创建 Board
        </button>
      </section>

      {confirmedBoard ? (
        <div className={styles.notice}>
          <Feedback
            title={`已创建“${confirmedBoard.board_name}”`}
            tone={listMayBeStale ? "warning" : "success"}
            actions={
              <a className="button" href={`/boards/${confirmedBoard.board_id}`}>
                查看详情
              </a>
            }
          >
            {listMayBeStale
              ? "创建已确认，但列表刷新失败，当前总数可能不是最新状态。"
              : "服务端已确认创建，列表已重新同步。"}
          </Feedback>
        </div>
      ) : null}

      {navigationState?.deletedBoardName ? (
        <div className={styles.notice}>
          <Feedback title="Board 已删除" tone="success">
            已确认删除“{navigationState.deletedBoardName}”，列表正在按服务端状态重新读取。
          </Feedback>
        </div>
      ) : null}

      {createStatus === "result_unknown" ? (
        <div className={styles.notice}>
          <Feedback
            title="创建结果暂时未知"
            tone="warning"
            actions={
              <button className="button" type="button" onClick={checkUnknownResult}>
                重新查询列表
              </button>
            }
          >
            {createError}
          </Feedback>
        </div>
      ) : null}

      <section className={styles.collection} aria-labelledby="board-list-title">
        <div className={styles.collectionHeader}>
          <div>
            <p className={styles.label}>Project index</p>
            <h2 id="board-list-title">全部 Board</h2>
          </div>
          <div className={styles.count} aria-live="polite">
            <strong>{data?.total ?? "—"}</strong>
            <span>Boards</span>
          </div>
        </div>

        {status === "loading" && data ? (
          <p className={styles.syncing} role="status">
            正在同步最新列表…
          </p>
        ) : null}

        {status === "failure" && data ? (
          <Feedback
            title="列表可能不是最新状态"
            tone="warning"
            actions={
              <button className="button" type="button" onClick={() => void refresh()}>
                重试刷新
              </button>
            }
          >
            {getBoardErrorMessage(error)}
          </Feedback>
        ) : null}

        {isInitialLoading ? (
          <div className={styles.skeletonGrid} aria-label="正在加载 Board">
            {[0, 1, 2].map((item) => (
              <div className={styles.skeleton} key={item} />
            ))}
          </div>
        ) : null}

        {isInitialFailure ? (
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
        ) : null}

        {data?.items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyMark} aria-hidden="true">
              01
            </span>
            <h3>从第一个 Board 开始</h3>
            <p>为论文、数据或一次新的评审周期建立独立工作空间。</p>
            <button className="button" type="button" onClick={openCreate}>
              创建第一个 Board
            </button>
          </div>
        ) : null}

        {data && data.items.length > 0 ? (
          <div className={styles.grid}>
            {data.items.map((board) => (
              <BoardCard board={board} key={board.board_id} />
            ))}
          </div>
        ) : null}
      </section>

      {createOpen ? (
        <BoardFormModal
          open
          title="创建 Board"
          description="一个 Board 对应一个独立研究项目或评审周期。"
          submitLabel="创建 Board"
          status={createStatus}
          requestError={createError}
          onClose={() => setCreateOpen(false)}
          onSubmit={submitCreate}
        />
      ) : null}
    </main>
  );
}
