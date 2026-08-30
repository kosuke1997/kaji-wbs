/**
 * 読込中のプレースホルダ矩形。props を取らない最小実装。
 * アニメーションは付けない（キーフレームの値がトークンに無いため）。
 */
export function Skeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: "var(--space-12)",
        borderRadius: "var(--radius-sm)",
        background: "var(--color-surface)",
      }}
    />
  );
}
