import { describe, expect, it } from "vitest";

import type { DirectoryTreeNode } from "../api/types";
import {
  countDirectories,
  findDirectory,
  flattenDirectories,
  getDescendantIds,
  getMoveTargets,
  reconcileExpandedIds,
} from "./directory-tree";

const grandchild: DirectoryTreeNode = {
  dir_id: "grandchild",
  dir_name: "Grandchild",
  parent_id: "child",
  board_id: "board-1",
  creator_id: "dev123456",
  children: [],
};

const child: DirectoryTreeNode = {
  ...grandchild,
  dir_id: "child",
  dir_name: "Child",
  parent_id: "root-a",
  children: [grandchild],
};

const tree: DirectoryTreeNode[] = [
  {
    ...child,
    dir_id: "root-a",
    dir_name: "Root A",
    parent_id: null,
    children: [child],
  },
  {
    ...child,
    dir_id: "root-b",
    dir_name: "Root B",
    parent_id: null,
    children: [],
  },
];

describe("directory tree helpers", () => {
  it("flattens without changing server order", () => {
    expect(flattenDirectories(tree).map(({ directory }) => directory.dir_id)).toEqual([
      "root-a",
      "child",
      "grandchild",
      "root-b",
    ]);
    expect(countDirectories(tree)).toBe(4);
  });

  it("finds a node and collects only its descendants", () => {
    expect(findDirectory(tree, "child")?.dir_name).toBe("Child");
    expect([...getDescendantIds(tree[0])]).toEqual(["child", "grandchild"]);
  });

  it("excludes the moving directory and descendants from targets", () => {
    expect(
      getMoveTargets(tree, "root-a").map(({ directory }) => directory.dir_id),
    ).toEqual(["root-b"]);
  });

  it("drops expanded IDs that disappeared after refresh", () => {
    expect([...reconcileExpandedIds(tree, new Set(["child", "missing"]))]).toEqual([
      "child",
    ]);
  });
});
