import type { ApiErrorResponse } from "../../../shared/api/http";

export interface BoardResponse {
  board_id: string;
  board_name: string;
  creator_id: string;
}

export interface BoardListResponse {
  items: BoardResponse[];
  total: number;
}

export interface CreateBoardRequest {
  board_name: string;
}

export interface UpdateBoardRequest {
  board_name: string;
}

export type ErrorResponse = ApiErrorResponse;

export type QueryStatus = "idle" | "loading" | "success" | "failure";

export type MutationStatus =
  | "idle"
  | "submitting"
  | "success"
  | "failure"
  | "result_unknown";
