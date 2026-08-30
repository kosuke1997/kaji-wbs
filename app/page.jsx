import { EmptyState } from "../components/EmptyState.jsx";
import { ErrorState } from "../components/ErrorState.jsx";
import { TaskList } from "../components/TaskList.jsx";
import { getTaskGroups } from "../lib/tasks.js";

// このページは DB を参照する。ビルド時に接続しないよう、常に動的に描画する
// （app/api/health/route.js と同じ扱い）。
export const dynamic = "force-dynamic";

export default async function Home() {
  let groups = [];
  let failed = false;

  try {
    groups = await getTaskGroups();
  } catch {
    failed = true;
  }

  const isEmpty = !failed && groups.length === 0;

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "var(--space-8) var(--space-4)" }}>
      <h1 style={{ fontSize: "var(--text-heading)", lineHeight: 1.3, margin: 0 }}>
        家事WBS
      </h1>
      <p
        style={{
          fontSize: "var(--text-body)",
          color: "var(--color-text-muted)",
          margin: "var(--space-3) 0 0",
        }}
      >
        大分類ごとの家事の一覧です。担当と合意レベルは、二人で基準をそろえるために置いています。
      </p>
      <p
        style={{
          fontSize: "var(--text-caption)",
          color: "var(--color-text-muted)",
          margin: "var(--space-2) 0 0",
        }}
      >
        このページは表示のみです。
      </p>

      {failed && (
        <ErrorState
          title="一覧を表示できませんでした"
          description="データの取得に失敗しました。時間をおいて、もう一度読み込んでください。"
          actionLabel="再読み込み"
          actionHref="/"
        />
      )}

      {!failed && isEmpty && (
        <EmptyState
          title="家事タスクがまだありません"
          description="初期データがまだ入っていません。少し時間をおいて読み込み直すと表示されます。"
          actionLabel="再読み込み"
          actionHref="/"
        />
      )}

      {!failed && !isEmpty && <TaskList groups={groups} />}

      <FeedbackWidget />
    </main>
  );
}

/**
 * フィードバック窓口。全プロダクト共通の feedback-hub に投げる。
 * project_id は自分のプロダクト名に置き換えること。
 */
function FeedbackWidget() {
  return (
    <script
      async
      src="https://feedback-hub.vercel.app/widget.js"
      data-project-id="kaji-wbs"
    />
  );
}
