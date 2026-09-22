import type { BoardResponse } from "../api/types";
import styles from "./BoardMetadata.module.css";

interface BoardMetadataProps {
  board: BoardResponse;
}

/**
 * 以只读定义列表展示 Board 标识信息。
 */
export function BoardMetadata({ board }: BoardMetadataProps) {
  return (
    <dl className={styles.list}>
      <div>
        <dt>Board ID</dt>
        <dd>{board.board_id}</dd>
      </div>
      <div>
        <dt>创建人 ID</dt>
        <dd>{board.creator_id}</dd>
      </div>
      <div>
        <dt>根目录 ID</dt>
        <dd>{board.root_directory_id}</dd>
      </div>
    </dl>
  );
}
