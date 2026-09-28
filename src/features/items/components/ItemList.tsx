import type { ItemResponse } from "../api/types";
import styles from "./ItemWorkspace.module.css";

interface ItemListProps {
  items: ItemResponse[];
  selectedId: string | null;
  locationName: string;
  onSelect: (itemId: string) => void;
  onUpload: () => void;
}

/** 当前目录直属 Item 列表；顺序完全由服务端响应决定。 */
export function ItemList({ items, selectedId, locationName, onSelect, onUpload }: ItemListProps) {
  return (
    <section className={styles.listPanel} aria-labelledby="item-list-title">
      <header className={styles.panelHeading}>
        <div>
          <p className={styles.panelLabel}>当前目录</p>
          <h3 id="item-list-title">{locationName}</h3>
        </div>
        <span>{items.length} 项</span>
      </header>
      {items.length === 0 ? (
        <div className={styles.empty}>
          <strong>这里还没有 Item</strong>
          <p>上传 UTF-8 文本、PDF 或 Word 文档，创建当前目录的第一项资料。</p>
          <button className="button button--primary" type="button" onClick={onUpload}>
            上传到此处
          </button>
        </div>
      ) : (
        <ul className={styles.itemList}>
          {items.map((item) => (
            <li key={item.item_id}>
              <button
                className={styles.itemButton}
                type="button"
                aria-pressed={selectedId === item.item_id}
                onClick={() => onSelect(item.item_id)}
              >
                <strong>{item.item_name}</strong>
                <span>{item.item_category.join(" · ")}</span>
                <small>本地文件</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
