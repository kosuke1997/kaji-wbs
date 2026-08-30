/**
 * 空状態。見出し + 説明 + 次のアクションの3点を必ず持つ。
 * 「データがありません」だけを出すことを禁止する。
 * 次に何をすべきかを示さない空状態は、ユーザーを行き止まりに置く。
 */
export function EmptyState({ title, description, actionLabel, actionHref }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-8) var(--space-4)",
        textAlign: "center",
        marginTop: "var(--space-6)",
      }}
    >
      <p style={{ fontSize: "var(--text-title)", margin: 0 }}>{title}</p>
      <p style={{ color: "var(--color-text-muted)", margin: "var(--space-2) 0 var(--space-6)" }}>
        {description}
      </p>
      {actionLabel && (
        <a
          href={actionHref}
          role="button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 var(--space-6)",
            background: "var(--color-primary)",
            color: "var(--color-primary-text)",
            borderRadius: "var(--radius-sm)",
            textDecoration: "none",
          }}
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
