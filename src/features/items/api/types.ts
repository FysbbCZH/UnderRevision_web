export const BOARD_CATEGORIES = [
  "ALL",
  "REFERENCE",
  "TEMPLATE",
  "DATA",
  "SOURCE",
  "PRODUCT",
] as const;

export type BoardCategory = (typeof BOARD_CATEGORIES)[number];

export interface ItemResponse {
  item_id: string;
  item_name: string;
  item_source_type: "SNIP";
  item_source_id: string;
  item_category: BoardCategory[];
  directory_id: string | null;
  board_id: string;
  creator_id: string;
  status: "ACTIVE";
  revision: string;
  extra_params: Record<string, unknown> | null;
}

export interface ItemDirectoryTreeNode {
  dir_id: string;
  dir_name: string;
  parent_id: string | null;
  board_id: string;
  creator_id: string;
  items: ItemResponse[];
  children: ItemDirectoryTreeNode[];
}

export interface ItemDirectoryTreeResponse {
  root_items: ItemResponse[];
  directories: ItemDirectoryTreeNode[];
}

export interface CreateFileItemRequest {
  file: File;
  itemName: string;
  fingerPrint: string;
  directoryId: string | null;
  categories: BoardCategory[];
}

export interface UpdateItemRequest {
  item_name?: string;
  directory_id?: string | null;
  categories?: BoardCategory[];
}

export interface ItemDownload {
  blob: Blob;
  fileName: string;
}

export type QueryStatus = "idle" | "loading" | "success" | "failure";
export type MutationStatus =
  | "idle"
  | "hashing"
  | "submitting"
  | "success"
  | "failure"
  | "result_unknown";
