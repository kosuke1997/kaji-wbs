/**
 * 取得失敗の表示。見出し + 説明 + 次のアクションの3点を必ず持つ。
 * 構造は EmptyState を写して一貫性を保つが、role="alert" を持つ点が異なる。
 */
export function ErrorState({ title, description, actionLabel, actionHref }) {
  return (
    <div
      role="alert"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-danger)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-8) var(--space-4)",
        textAlign: "center",
        marginTop: "var(--space-6)",
      }}
    >
      <p style={{ fontSize: "var(--text-title)", color: "var(--color-danger)", margin: 0 }}>
        {title}
      </p>
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
