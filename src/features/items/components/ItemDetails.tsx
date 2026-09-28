import type { ItemDirectoryTreeNode, ItemResponse } from "../api/types";
import { findItemDirectory } from "../model/item-tree";
import styles from "./ItemWorkspace.module.css";

interface ItemDetailsProps {
  item: ItemResponse | null;
  directories: ItemDirectoryTreeNode[];
  downloadBusy: boolean;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

/** 展示用户可理解的 Item 元数据与操作，不暴露 Snip 或 extra_params。 */
export function ItemDetails(props: ItemDetailsProps) {
  if (!props.item) {
    return (
      <aside className={styles.detailsPanel}>
        <p className={styles.panelLabel}>Item 操作</p>
        <h3>尚未选择 Item</h3>
        <p>从当前目录列表中选择一项，可查看信息、下载、编辑或删除。</p>
      </aside>
    );
  }
  const item = props.item;
  const location = findItemDirectory(props.directories, item.directory_id)?.dir_name ?? "Board 顶层";
  return (
    <aside className={styles.detailsPanel} aria-label={`Item ${item.item_name} 的操作`}>
      <p className={styles.panelLabel}>Selected item</p>
      <h3>{item.item_name}</h3>
      <dl className={styles.metadata}>
        <div><dt>位置</dt><dd>{location}</dd></div>
        <div><dt>类别</dt><dd>{item.item_category.join("、")}</dd></div>
        <div><dt>Item ID</dt><dd>{item.item_id}</dd></div>
        <div><dt>创建人</dt><dd>{item.creator_id}</dd></div>
      </dl>
      <div className={styles.detailActions}>
        <button className="button" type="button" onClick={props.onEdit}>编辑信息</button>
        <button className="button" type="button" disabled={props.downloadBusy} onClick={props.onDownload}>
          {props.downloadBusy ? "正在下载…" : "下载文件"}
        </button>
        <button className="button button--danger" type="button" onClick={props.onDelete}>删除 Item</button>
      </div>
    </aside>
  );
}
