import { useState, type FormEvent } from "react";

import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { BoardCategory, ItemDirectoryTreeNode, ItemResponse, MutationStatus, UpdateItemRequest } from "../api/types";
import { buildItemUpdate } from "../model/validate-item-input";
import { CategoryFields, LocationField } from "./ItemFormFields";
import styles from "./ItemModal.module.css";

interface EditItemModalProps {
  item: ItemResponse;
  directories: ItemDirectoryTreeNode[];
  status: MutationStatus;
  requestError: string | null;
  onClose: () => void;
  onSubmit: (request: UpdateItemRequest) => Promise<void>;
}

/** 编辑 Item 元数据，只向父级提交实际变化字段。 */
export function EditItemModal(props: EditItemModalProps) {
  const [itemName, setItemName] = useState(props.item.item_name);
  const [directoryId, setDirectoryId] = useState(props.item.directory_id);
  const [categories, setCategories] = useState<BoardCategory[]>(props.item.item_category);
  const [validationError, setValidationError] = useState<string | null>(null);
  const busy = props.status === "submitting";
  const candidate = buildItemUpdate(props.item, { itemName, directoryId, categories });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (candidate.error) {
      setValidationError(candidate.error);
      return;
    }
    setValidationError(null);
    await props.onSubmit(candidate.request);
  };

  return (
    <Modal
      open title={`编辑“${props.item.item_name}”`} kicker="Edit item"
      description="保存时使用当前 revision；冲突后需基于最新数据重新编辑。"
      busy={busy} onClose={props.onClose}
      footer={
        <>
          <button className="button" type="button" disabled={busy} onClick={props.onClose}>取消</button>
          <button className="button button--primary" form="edit-item-form" type="submit" disabled={busy || Boolean(candidate.error)}>
            {busy ? "正在保存…" : "保存修改"}
          </button>
        </>
      }
    >
      <form id="edit-item-form" className={styles.form} onSubmit={(event) => void submit(event)}>
        <label className={styles.field}>
          Item 名称
          <input value={itemName} maxLength={255} disabled={busy} onChange={(event) => setItemName(event.target.value)} />
        </label>
        <LocationField directories={props.directories} value={directoryId} disabled={busy} onChange={setDirectoryId} />
        <CategoryFields value={categories} disabled={busy} onChange={setCategories} />
        {validationError || props.requestError ? (
          <Feedback title="暂时无法保存" tone="error">{validationError ?? props.requestError}</Feedback>
        ) : null}
      </form>
    </Modal>
  );
}
