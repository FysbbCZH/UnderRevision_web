import { useState, type ChangeEvent, type FormEvent } from "react";

import { Feedback } from "../../../shared/ui/Feedback";
import { Modal } from "../../../shared/ui/Modal";
import type { BoardCategory, ItemDirectoryTreeNode, MutationStatus } from "../api/types";
import { normalizeItemName } from "../model/validate-item-input";
import { CategoryFields, LocationField } from "./ItemFormFields";
import styles from "./ItemModal.module.css";

export interface UploadItemDraft {
  file: File;
  itemName: string;
  directoryId: string | null;
  categories: BoardCategory[];
}

interface UploadItemModalProps {
  open: boolean;
  directories: ItemDirectoryTreeNode[];
  initialDirectoryId: string | null;
  status: MutationStatus;
  requestError: string | null;
  onClose: () => void;
  onSubmit: (draft: UploadItemDraft) => Promise<void>;
}

/** 收集单个受支持文档及 Item 元数据，并明确显示 hash 与上传阶段。 */
export function UploadItemModal(props: UploadItemModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [itemName, setItemName] = useState("");
  const [directoryId, setDirectoryId] = useState(props.initialDirectoryId);
  const [categories, setCategories] = useState<BoardCategory[]>(["ALL"]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const busy = props.status === "hashing" || props.status === "submitting";

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    if (nextFile) setItemName(nextFile.name);
    setValidationError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setValidationError("请选择一个本地文件。");
      return;
    }
    const name = normalizeItemName(itemName);
    if (name.error) {
      setValidationError(name.error);
      return;
    }
    setValidationError(null);
    await props.onSubmit({ file, itemName: name.value, directoryId, categories });
  };

  return (
    <Modal
      open={props.open}
      title="上传文件"
      kicker="Create item"
      description="支持 UTF-8 文本、PDF、DOC 和 DOCX；浏览器先计算 SHA-256，再上传并创建 Item。"
      onClose={props.onClose}
      footer={
        <>
          <button className="button" type="button" onClick={props.onClose}>
            {props.status === "hashing" ? "取消计算" : props.status === "submitting" ? "停止等待" : "取消"}
          </button>
          <button className="button button--primary" form="upload-item-form" type="submit" disabled={busy}>
            {props.status === "hashing" ? "正在计算指纹…" : props.status === "submitting" ? "正在上传…" : "上传并创建"}
          </button>
        </>
      }
    >
      <form id="upload-item-form" className={styles.form} onSubmit={(event) => void submit(event)}>
        <label className={styles.field}>
          本地文件
          <input
            type="file"
            accept="text/*,.txt,.md,.csv,.json,.yaml,.yml,.pdf,.doc,.docx"
            disabled={busy}
            onChange={selectFile}
          />
        </label>
        <label className={styles.field}>
          Item 名称
          <input value={itemName} maxLength={255} disabled={busy} onChange={(event) => setItemName(event.target.value)} />
        </label>
        <LocationField directories={props.directories} value={directoryId} disabled={busy} onChange={setDirectoryId} />
        <CategoryFields value={categories} disabled={busy} onChange={setCategories} />
        {props.status === "hashing" ? <p className={styles.stage} role="status">正在计算 SHA-256…</p> : null}
        {props.status === "submitting" ? <p className={styles.stage} role="status">正在上传并创建 Item…</p> : null}
        {validationError || props.requestError ? (
          <Feedback title="暂时无法创建" tone="error">{validationError ?? props.requestError}</Feedback>
        ) : null}
      </form>
    </Modal>
  );
}
