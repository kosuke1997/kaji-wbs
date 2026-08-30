import { test } from "node:test";
import assert from "node:assert/strict";
import { sortTasks, groupTasksByCategory } from "../lib/tasks.js";

const unsorted = [
  { id: 5, category_major: "B. 洗濯" },
  { id: 2, category_major: "A. 食事" },
  { id: 1, category_major: "A. 食事" },
  { id: 3, category_major: "B. 洗濯" },
];

test("category_major の昇順、同一大分類内は id 昇順に並ぶ", () => {
  const sorted = sortTasks(unsorted);
  assert.deepEqual(
    sorted.map((t) => [t.category_major, t.id]),
    [
      ["A. 食事", 1],
      ["A. 食事", 2],
      ["B. 洗濯", 3],
      ["B. 洗濯", 5],
    ]
  );
});

test("元の配列を変更しない", () => {
  const before = unsorted.map((t) => t.id);
  sortTasks(unsorted);
  assert.deepEqual(
    unsorted.map((t) => t.id),
    before
  );
});

test("同一大分類ごとにグループ化される", () => {
  const groups = groupTasksByCategory(unsorted);
  assert.deepEqual(
    groups.map((g) => g.categoryMajor),
    ["A. 食事", "B. 洗濯"]
  );
  assert.deepEqual(
    groups.map((g) => g.tasks.map((t) => t.id)),
    [
      [1, 2],
      [3, 5],
    ]
  );
});

test("並び替えていない入力でも正しくグループ化する", () => {
  const groups = groupTasksByCategory([
    { id: 3, category_major: "B. 洗濯" },
    { id: 1, category_major: "A. 食事" },
  ]);
  assert.deepEqual(
    groups.map((g) => g.categoryMajor),
    ["A. 食事", "B. 洗濯"]
  );
});

test("空配列は空配列を返す", () => {
  assert.deepEqual(groupTasksByCategory([]), []);
});
