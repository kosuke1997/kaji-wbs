import { Skeleton } from "../components/Skeleton.jsx";

/**
 * 初期/読込中の状態。ページシェル（h1 / リード文 / 補足文 / FeedbackWidget）を
 * page.jsx と揃えて常に描画し、本体だけをスケルトンに差し替える。
 * これにより白画面が原理的に発生しない。
 */
export default function Loading() {
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

      <p role="status" style={{ margin: "var(--space-6) 0 0" }}>
        読み込んでいます…
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          marginTop: "var(--space-3)",
        }}
      >
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>

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
