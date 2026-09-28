import { useState } from "react";

import { ApiError } from "../../../shared/api/api-error";
import { Feedback } from "../../../shared/ui/Feedback";
import type { UpdateItemRequest } from "../api/types";
import { countItems, findItemDirectory } from "../model/item-tree";
import { useItemMutations } from "../model/use-item-mutations";
import { useItemTree } from "../model/use-item-tree";
import { DeleteItemModal } from "./DeleteItemModal";
import { EditItemModal } from "./EditItemModal";
import { ItemDetails } from "./ItemDetails";
import { ItemDirectoryNav } from "./ItemDirectoryNav";
import { ItemList } from "./ItemList";
import { UploadItemModal, type UploadItemDraft } from "./UploadItemModal";
import styles from "./ItemWorkspace.module.css";

interface ItemWorkspaceProps {
  boardId: string;
  invalidationVersion?: number;
}

/** Board 详情中的 Item 管理边界，组合树状态、变更和三段式界面。 */
export function ItemWorkspace({ boardId, invalidationVersion = 0 }: ItemWorkspaceProps) {
  const tree = useItemTree(boardId, invalidationVersion);
  const mutations = useItemMutations(boardId, tree.refresh);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const total = countItems(tree.tree);
  const selectedDirectory = findItemDirectory(tree.tree.directories, tree.selectedDirectoryId);
  const locationName = selectedDirectory?.dir_name ?? "Board 顶层";
  const requestError = getErrorMessage(mutations.state.error);
  const boardMissing = tree.error instanceof ApiError && tree.error.code === "BOARD_NOT_FOUND";

  const openUpload = () => {
    mutations.resetMutation();
    setUploadOpen(true);
  };
  const closeUpload = () => {
    if (mutations.state.operation === "upload" &&
      (mutations.state.status === "hashing" || mutations.state.status === "submitting")) {
      mutations.cancelUpload();
    }
    setUploadOpen(false);
  };
  const submitUpload = async (draft: UploadItemDraft) => {
    const result = await mutations.upload(draft);
    if (result.status !== "failure") setUploadOpen(false);
  };
  const submitEdit = async (request: UpdateItemRequest) => {
    if (!tree.selectedItem) return;
    const result = await mutations.edit(tree.selectedItem, request);
    if (result.status !== "failure") setEditOpen(false);
  };
  const confirmDelete = async () => {
    if (!tree.selectedItem) return;
    const result = await mutations.remove(tree.selectedItem);
    if (result !== "failure") setDeleteOpen(false);
  };

  return (
    <section className={styles.workspace} aria-labelledby="items-title">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Item workspace</p>
          <h2 id="items-title">资料</h2>
          <p>{total} 个 ACTIVE Item，按服务端目录与顺序展示。</p>
        </div>
        <div className={styles.headerActions}>
          <button className="button" type="button" disabled={tree.status === "loading"} onClick={() => void tree.refresh()}>
            {tree.status === "loading" ? "正在刷新…" : "刷新资料"}
          </button>
          <button className="button button--primary" type="button" onClick={openUpload}>上传文件</button>
        </div>
      </header>

      <MutationNotice state={mutations.state} onReconcile={() => void mutations.reconcileUnknown()} onDismiss={mutations.resetMutation} />
      {tree.selectionChanged ? (
        <Feedback title="选择已更新" tone="warning">原目录或 Item 已不在最新数据中，请重新选择。</Feedback>
      ) : null}
      {tree.status === "failure" ? (
        <Feedback
          title={boardMissing ? "Board 不存在" : "Item 树刷新失败"}
          tone="error"
          actions={<button className="button" type="button" onClick={() => void tree.refresh()}>手动重试</button>}
        >
          {getErrorMessage(tree.error)}{total > 0 ? " 当前仍显示上次确认的数据。" : ""}
        </Feedback>
      ) : null}
      {tree.status === "loading" && total === 0 ? <p className={styles.loading} role="status">正在读取 Item 树…</p> : null}

      {!boardMissing ? (
        <div className={styles.layout}>
          <ItemDirectoryNav
            directories={tree.tree.directories}
            selectedId={tree.selectedDirectoryId}
            expandedIds={tree.expandedIds}
            onSelect={tree.selectDirectory}
            onToggle={tree.toggleExpanded}
          />
          <ItemList
            items={tree.currentItems}
            selectedId={tree.selectedItemId}
            locationName={locationName}
            onSelect={(itemId) => tree.selectItem(itemId)}
            onUpload={openUpload}
          />
          <ItemDetails
            item={tree.selectedItem}
            directories={tree.tree.directories}
            downloadBusy={mutations.state.operation === "download" && mutations.state.status === "submitting"}
            onEdit={() => { mutations.resetMutation(); setEditOpen(true); }}
            onDownload={() => tree.selectedItem && void mutations.download(tree.selectedItem)}
            onDelete={() => { mutations.resetMutation(); setDeleteOpen(true); }}
          />
        </div>
      ) : null}

      {uploadOpen ? (
        <UploadItemModal
          open directories={tree.tree.directories} initialDirectoryId={tree.selectedDirectoryId}
          status={mutations.state.operation === "upload" ? mutations.state.status : "idle"}
          requestError={mutations.state.operation === "upload" ? requestError : null}
          onClose={closeUpload} onSubmit={submitUpload}
        />
      ) : null}
      {editOpen && tree.selectedItem ? (
        <EditItemModal
          item={tree.selectedItem} directories={tree.tree.directories}
          status={mutations.state.operation === "edit" ? mutations.state.status : "idle"}
          requestError={mutations.state.operation === "edit" ? requestError : null}
          onClose={() => setEditOpen(false)} onSubmit={submitEdit}
        />
      ) : null}
      {deleteOpen && tree.selectedItem ? (
        <DeleteItemModal
          itemName={tree.selectedItem.item_name}
          status={mutations.state.operation === "delete" ? mutations.state.status : "idle"}
          requestError={mutations.state.operation === "delete" ? requestError : null}
          onClose={() => setDeleteOpen(false)} onConfirm={confirmDelete}
        />
      ) : null}
    </section>
  );
}

function MutationNotice({ state, onReconcile, onDismiss }: {
  state: ReturnType<typeof useItemMutations>["state"];
  onReconcile: () => void;
  onDismiss: () => void;
}) {
  if (state.status === "result_unknown") {
    return (
      <Feedback title="Item 操作结果暂时未知" tone="warning" actions={<button className="button" type="button" onClick={onReconcile}>重新查询服务端状态</button>}>
        {getErrorMessage(state.error)} 上传结果可能重复，核对前请勿自动重试。
      </Feedback>
    );
  }
  if (state.status === "failure" && state.operation === "download") {
    return <Feedback title="文件下载失败" tone="error">{getErrorMessage(state.error)}</Feedback>;
  }
  if (state.status !== "success" || !state.message) return null;
  return (
    <Feedback
      title={state.treeMayBeStale ? "操作已确认，Item 树可能过期" : "Item 操作已确认"}
      tone={state.treeMayBeStale ? "warning" : "success"}
      actions={<button className="button" type="button" onClick={onDismiss}>关闭</button>}
    >
      {state.message}
    </Feedback>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "请求未能完成，请稍后重试。";
}
