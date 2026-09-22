export interface DirectoryResponse {
  dir_id: string;
  dir_name: string;
  parent_id: string | null;
  board_id: string;
  creator_id: string;
}

export interface DirectoryTreeNode extends DirectoryResponse {
  children: DirectoryTreeNode[];
}

export interface DirectoryTreeResponse {
  directories: DirectoryTreeNode[];
}

export interface CreateDirectoryRequest {
  dir_name: string;
  parent_id: string | null;
}

export interface UpdateDirectoryRequest {
  dir_name?: string;
  parent_id?: string | null;
}

export type QueryStatus = "idle" | "loading" | "success" | "failure";

export type MutationStatus =
  | "idle"
  | "submitting"
  | "success"
  | "failure"
  | "result_unknown";
