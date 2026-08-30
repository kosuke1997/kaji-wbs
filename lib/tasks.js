import { getTurso } from "./turso.js";

/**
 * 大分類（category_major）昇順 → 同一大分類内は id 昇順に並べ替える。
 * DB接続なしでテストできるよう、取得ロジックから切り離した純粋関数にしてある。
 */
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.category_major !== b.category_major) {
      return a.category_major < b.category_major ? -1 : 1;
    }
    return a.id - b.id;
  });
}

/**
 * 並び替え済みのタスクを、同一 category_major ごとの連続する塊にまとめる。
 * 入力が sortTasks 済みであることを前提にせず、まず自前で並び替える。
 */
export function groupTasksByCategory(tasks) {
  const sorted = sortTasks(tasks);
  const groups = [];
  for (const task of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.categoryMajor === task.category_major) {
      last.tasks.push(task);
    } else {
      groups.push({ categoryMajor: task.category_major, tasks: [task] });
    }
  }
  return groups;
}

/**
 * active = 1 のタスクのみを、大分類ごとにグループ化して返す。
 * DB取得に失敗した場合は呼び出し元で catch すること（画面側は ErrorState を出す）。
 */
export async function getTaskGroups() {
  const result = await getTurso().execute(
    "SELECT id, category_major, category_mid, title, kind, frequency_label, assignee, agreed_level FROM task WHERE active = 1"
  );
  return groupTasksByCategory(result.rows);
}
