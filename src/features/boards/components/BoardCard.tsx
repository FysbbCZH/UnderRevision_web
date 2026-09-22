import { Link } from "react-router-dom";

import type { BoardResponse } from "../api/types";
import styles from "./BoardCard.module.css";

interface BoardCardProps {
  board: BoardResponse;
}

/**
 * 展示 Board 的最小可识别信息，并提供唯一的详情入口。
 */
export function BoardCard({ board }: BoardCardProps) {
  return (
    <article className={styles.card}>
      <span className={styles.sequence} aria-hidden="true">
        Board
      </span>
      <h2>{board.board_name}</h2>
      <p className={styles.id}>{board.board_id}</p>
      <Link
        className={styles.link}
        to={`/boards/${encodeURIComponent(board.board_id)}`}
      >
        查看 Board
        <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
