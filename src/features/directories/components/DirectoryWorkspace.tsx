import { useState } from "react";

import { ApiError } from "../../../shared/api/api-error";
import { Feedback } from "../../../shared/ui/Feedback";
import type { DirectoryTreeNode, MutationStatus } from "../api/types";
import { countDirectories, findDirectory } from "../model/directory-tree";
import {
  type DirectoryOperation,
  useDirectoryMutations,
  useDirectoryTree,
} from "../model/use-directory-tree";
import { DeleteDirectoryModal } from "./DeleteDirectoryModal";
import { DirectoryNameModal } from "./DirectoryNameModal";
import { DirectoryTree } from "./DirectoryTree";
import { MoveDirectoryModal } from "./MoveDirectoryModal";
import styles from "./DirectoryWorkspace.module.css";

interface DirectoryWorkspaceProps {
  boardId: string;
}

interface CreateTarget {
  parentId: string | null;
  label: string;
}

type DirectoryTreeState = ReturnType<typeof useDirectoryTree>;
type DirectoryMutations = ReturnType<typeof useDirectoryMutations>;

/** Board 详情页中的目录管理边界，组合查询、选择和全部目录变更。 */
export function DirectoryWorkspace({ boardId }: DirectoryWorkspaceProps) {
  const tree = useDirectoryTree(boardId);
  const mutations = useDirectoryMutations(boardId, tree.refresh, tree.selectDirectory);
  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const total = countDirectories(tree.directories);
  const queryError = getErrorMessage(tree.error);

  const openCreate = (parent: DirectoryTreeNode | null) => {
    mutations.resetMutation();
    setCreateTarget({
      parentId: parent?.dir_id ?? null,
      label: parent?.dir_name ?? "Board 顶层",
    });
  };

  const submitCreate = async (name: string) => {
    if (!createTarget) return;
    const result = await mutations.create(name, createTarget.parentId);
    if (result !== "failure") setCreateTarget(null);
  };

  const submitRename = async (name: string) => {
    if (!tree.selectedDirectory) return;
    const result = await mutations.rename(tree.selectedDirectory.dir_id, name);
    if (result !== "failure") setRenameOpen(false);
  };

  const submitMove = async (parentId: string | null) => {
    if (!tree.selectedDirectory) return;
    const result = await mutations.move(tree.selectedDirectory.dir_id, parentId);
    if (result !== "failure") setMoveOpen(false);
  };

  const confirmDelete = async () => {
    if (!tree.selectedDirectory) return;
    const result = await mutations.remove(
      tree.selectedDirectory.dir_id,
      tree.selectedDirectory.dir_name,
    );
    if (result !== "failure") setDeleteOpen(false);
  };

  const boardMissing =
    tree.error instanceof ApiError && tree.error.code === "BOARD_NOT_FOUND";

  return (
    <section className={styles.workspace} aria-labelledby="directories-title">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Directory workspace</p>
          <h2 id="directories-title">目录</h2>
          <p>{total} 个用户可见目录；Board 根目录不会在此显示。</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className="button"
            type="button"
            disabled={tree.status === "loading"}
            onClick={() => void tree.refresh()}
          >
            {tree.status === "loading" ? "正在刷新…" : "刷新目录"}
          </button>
          <button className="button button--primary" type="button" onClick={() => openCreate(null)}>
            新建顶层目录
          </button>
        </div>
      </header>

      <MutationNotice
        mutation={mutations.mutation}
        onReconcile={() => void mutations.reconcileUnknown()}
        onDismiss={mutations.resetMutation}
      />

      {tree.selectionChanged ? (
        <Feedback title="目录选择已更新" tone="warning">
          原目录已不在最新目录树中，请重新选择。
        </Feedback>
      ) : null}

      <DirectoryWorkspaceContent
        tree={tree}
        boardMissing={boardMissing}
        queryError={queryError}
        onCreate={openCreate}
        onRename={() => {
          mutations.resetMutation();
          setRenameOpen(true);
        }}
        onMove={() => {
          mutations.resetMutation();
          setMoveOpen(true);
        }}
        onDelete={() => {
          mutations.resetMutation();
          setDeleteOpen(true);
        }}
      />
      <DirectoryDialogs
        tree={tree}
        mutations={mutations}
        createTarget={createTarget}
        renameOpen={renameOpen}
        moveOpen={moveOpen}
        deleteOpen={deleteOpen}
        onCloseCreate={() => setCreateTarget(null)}
        onCloseRename={() => setRenameOpen(false)}
        onCloseMove={() => setMoveOpen(false)}
        onCloseDelete={() => setDeleteOpen(false)}
        onCreate={submitCreate}
        onRename={submitRename}
        onMove={submitMove}
        onDelete={confirmDelete}
      />
    </section>
  );
}

interface DirectoryWorkspaceContentProps {
  tree: DirectoryTreeState;
  boardMissing: boolean;
  queryError: string;
  onCreate: (parent: DirectoryTreeNode | null) => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}

/** 渲染目录树状态和当前目录动作，保持查询状态分支集中。 */
function DirectoryWorkspaceContent({
  tree,
  boardMissing,
  queryError,
  onCreate,
  onRename,
  onMove,
  onDelete,
}: DirectoryWorkspaceContentProps) {
  if (boardMissing && tree.directories.length === 0) {
    return (
      <Feedback title="Board 不存在" tone="warning">
        当前 Board 已不存在或不可见，请返回 Board 主界面重新选择。
      </Feedback>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.treePanel}>
        {tree.status === "loading" && tree.directories.length === 0 ? (
          <p className={styles.placeholder} role="status">正在读取目录树…</p>
        ) : null}
        {tree.status === "failure" ? (
          <Feedback
            title="目录树刷新失败"
            tone="error"
            actions={<button className="button" type="button" onClick={() => void tree.refresh()}>手动重试</button>}
          >
            {queryError}
          </Feedback>
        ) : null}
        {tree.status !== "loading" && tree.directories.length === 0 && tree.status !== "failure" ? (
          <div className={styles.empty}>
            <strong>还没有目录</strong>
            <p>从 Board 顶层创建第一个目录，之后可继续添加子目录。</p>
            <button className="button button--primary" type="button" onClick={() => onCreate(null)}>
              创建第一个目录
            </button>
          </div>
        ) : null}
        {tree.directories.length > 0 ? (
          <DirectoryTree
            directories={tree.directories}
            selectedId={tree.selectedId}
            expandedIds={tree.expandedIds}
            onSelect={tree.selectDirectory}
            onToggle={tree.toggleExpanded}
          />
        ) : null}
      </div>
      <DirectoryActions
        directory={tree.selectedDirectory}
        directories={tree.directories}
        onCreateChild={() => tree.selectedDirectory && onCreate(tree.selectedDirectory)}
        onRename={onRename}
        onMove={onMove}
        onDelete={onDelete}
      />
    </div>
  );
}

interface DirectoryDialogsProps {
  tree: DirectoryTreeState;
  mutations: DirectoryMutations;
  createTarget: CreateTarget | null;
  renameOpen: boolean;
  moveOpen: boolean;
  deleteOpen: boolean;
  onCloseCreate: () => void;
  onCloseRename: () => void;
  onCloseMove: () => void;
  onCloseDelete: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onMove: (parentId: string | null) => Promise<void>;
  onDelete: () => Promise<void>;
}

/** 集中管理互斥弹窗，让目录工作区主体只负责流程编排。 */
function DirectoryDialogs(props: DirectoryDialogsProps) {
  const { tree, mutations, createTarget } = props;
  const selected = tree.selectedDirectory;
  return (
    <>
      {createTarget ? (
        <DirectoryNameModal
          open
          title={createTarget.parentId ? "新建子目录" : "新建顶层目录"}
          description="目录创建成功后会按服务端顺序刷新整棵目录树。"
          submitLabel="创建目录"
          locationLabel={createTarget.label}
          status={statusFor(mutations.mutation.operation, mutations.mutation.status, "create")}
          requestError={errorFor(mutations.mutation, "create")}
          onClose={props.onCloseCreate}
          onSubmit={props.onCreate}
        />
      ) : null}
      {props.renameOpen && selected ? (
        <DirectoryNameModal
          open
          title={`重命名“${selected.dir_name}”`}
          description="只有收到服务端成功响应后才更新目录树。"
          submitLabel="保存新名称"
          initialName={selected.dir_name}
          status={statusFor(mutations.mutation.operation, mutations.mutation.status, "rename")}
          requestError={errorFor(mutations.mutation, "rename")}
          onClose={props.onCloseRename}
          onSubmit={props.onRename}
        />
      ) : null}
      {props.moveOpen && selected ? (
        <MoveDirectoryModal
          open
          directory={selected}
          directories={tree.directories}
          status={statusFor(mutations.mutation.operation, mutations.mutation.status, "move")}
          requestError={errorFor(mutations.mutation, "move")}
          onClose={props.onCloseMove}
          onSubmit={props.onMove}
        />
      ) : null}
      {props.deleteOpen && selected ? (
        <DeleteDirectoryModal
          open
          directoryName={selected.dir_name}
          status={statusFor(mutations.mutation.operation, mutations.mutation.status, "delete")}
          requestError={errorFor(mutations.mutation, "delete")}
          onClose={props.onCloseDelete}
          onConfirm={props.onDelete}
        />
      ) : null}
    </>
  );
}

interface DirectoryActionsProps {
  directory: DirectoryTreeNode | null;
  directories: DirectoryTreeNode[];
  onCreateChild: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}

function DirectoryActions({
  directory,
  directories,
  onCreateChild,
  onRename,
  onMove,
  onDelete,
}: DirectoryActionsProps) {
  if (!directory) {
    return (
      <aside className={styles.actionPanel}>
        <h3>当前目录</h3>
        <p>请先从目录树选择一个目录，再进行创建子目录、重命名、移动或删除。</p>
      </aside>
    );
  }
  const parent = findDirectory(directories, directory.parent_id);
  return (
    <aside className={styles.actionPanel} aria-label={`目录 ${directory.dir_name} 的操作`}>
      <p className={styles.kicker}>Selected directory</p>
      <h3>{directory.dir_name}</h3>
      <p className={styles.locationText}>位置：{parent?.dir_name ?? "Board 顶层"}</p>
      <div className={styles.actionList}>
        <button className="button" type="button" onClick={onCreateChild}>新建子目录</button>
        <button className="button" type="button" onClick={onRename}>重命名</button>
        <button className="button" type="button" onClick={onMove}>移动</button>
        <button className="button button--danger" type="button" onClick={onDelete}>删除目录</button>
      </div>
    </aside>
  );
}

function MutationNotice({
  mutation,
  onReconcile,
  onDismiss,
}: {
  mutation: ReturnType<typeof useDirectoryMutations>["mutation"];
  onReconcile: () => void;
  onDismiss: () => void;
}) {
  if (mutation.status === "result_unknown") {
    return (
      <Feedback
        title="目录操作结果暂时未知"
        tone="warning"
        actions={<button className="button" type="button" onClick={onReconcile}>重新查询服务端状态</button>}
      >
        {getErrorMessage(mutation.error)}
      </Feedback>
    );
  }
  if (mutation.status !== "success" || !mutation.message) return null;
  return (
    <Feedback
      title={mutation.treeMayBeStale ? "操作已确认，目录树可能过期" : "目录操作已确认"}
      tone={mutation.treeMayBeStale ? "warning" : "success"}
      actions={<button className="button" type="button" onClick={onDismiss}>关闭</button>}
    >
      {mutation.message}
    </Feedback>
  );
}

function statusFor(
  currentOperation: DirectoryOperation | null,
  status: MutationStatus,
  expectedOperation: DirectoryOperation,
): MutationStatus {
  return currentOperation === expectedOperation ? status : "idle";
}

function errorFor(
  mutation: ReturnType<typeof useDirectoryMutations>["mutation"],
  operation: DirectoryOperation,
): string | null {
  return mutation.operation === operation && mutation.status === "failure"
    ? getErrorMessage(mutation.error)
    : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "请求未能完成，请稍后重试。";
}
