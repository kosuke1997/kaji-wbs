const metaLabelStyle = { color: "var(--color-text-muted)", marginRight: "var(--space-1)" };

const badgeStyle = {
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-full)",
  padding: "var(--space-1) var(--space-3)",
  background: "var(--color-surface)",
  fontSize: "var(--text-body)",
};

/**
 * 担当・合意レベルのバッジ。値が「未割当」「未合意」（まだ決めていない）のときは
 * 値の文字色のみ muted にする。色だけで意味を伝えないよう、文字列自体が
 * 「未割当」「未合意」と読めるようにしてある（WCAG 1.4.1）。
 */
function Badge({ label, value }) {
  const isPlaceholder = value === "未割当" || value === "未合意";
  return (
    <span style={badgeStyle}>
      {label}{" "}
      <span style={{ color: isPlaceholder ? "var(--color-text-muted)" : "var(--color-text)" }}>
        {value}
      </span>
    </span>
  );
}

function MetaRow({ kind, frequencyLabel }) {
  return (
    <p
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-1) var(--space-4)",
        margin: "var(--space-2) 0 0",
        fontSize: "var(--text-body)",
      }}
    >
      <span>
        <span style={metaLabelStyle}>種別</span>
        {kind}
      </span>
      <span>
        <span style={metaLabelStyle}>頻度</span>
        {frequencyLabel}
      </span>
    </p>
  );
}

/**
 * 大分類ごとにグループ化した家事タスクの読み取り専用一覧。
 * 行はリンク・ボタンにしない（M1 は読み取り専用）。
 */
export function TaskList({ groups }) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.categoryMajor} style={{ marginTop: "var(--space-8)" }}>
          <h2 style={{ fontSize: "var(--text-title)", margin: 0 }}>{group.categoryMajor}</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "var(--space-3) 0 0" }}>
            {group.tasks.map((task) => (
              <li
                key={task.id}
                style={{ padding: "var(--space-4) 0", borderTop: "1px solid var(--color-border)" }}
              >
                <h3 style={{ fontSize: "var(--text-body)", margin: 0, overflowWrap: "anywhere" }}>
                  {task.title}
                </h3>
                <MetaRow kind={task.kind} frequencyLabel={task.frequency_label} />
                <p
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--space-2)",
                    margin: "var(--space-2) 0 0",
                  }}
                >
                  <Badge label="担当" value={task.assignee} />
                  <Badge label="合意レベル" value={task.agreed_level} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
