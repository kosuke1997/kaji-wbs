import { EmptyState } from "../components/EmptyState.jsx";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "var(--space-8) var(--space-4)" }}>
      <h1 style={{ fontSize: "var(--text-heading)", lineHeight: 1.3, margin: 0 }}>
        &lt;PRODUCT_NAME&gt;
      </h1>

      <EmptyState
        title="まだ何もありません"
        description="最初の機能をここに追加します。"
        actionLabel="はじめる"
        actionHref="/"
      />

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
