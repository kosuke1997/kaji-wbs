import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@libsql/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "migrations");

async function createMigratedClient() {
  const client = createClient({ url: ":memory:" });
  const init = readFileSync(path.join(migrationsDir, "001_init.sql"), "utf8");
  const task = readFileSync(path.join(migrationsDir, "002_task.sql"), "utf8");
  await client.executeMultiple(init);
  await client.executeMultiple(task);
  return client;
}

function columnByName(columns, name) {
  return columns.find((c) => c.name === name);
}

test("member テーブルに 夫/妻 が冪等に投入される", async () => {
  const client = await createMigratedClient();

  const columns = (await client.execute("PRAGMA table_info('member')")).rows;
  const id = columnByName(columns, "id");
  const label = columnByName(columns, "label");
  assert.equal(id.type, "INTEGER");
  assert.equal(id.pk, 1);
  assert.equal(label.type, "TEXT");
  assert.equal(label.notnull, 1);

  const rows = (await client.execute("SELECT id, label FROM member ORDER BY id")).rows;
  assert.deepEqual(
    rows.map((r) => ({ id: r.id, label: r.label })),
    [
      { id: 1, label: "夫" },
      { id: 2, label: "妻" },
    ]
  );

  client.close();
});

test("002_task.sql を2回流しても member は2件のまま", async () => {
  const client = await createMigratedClient();
  const task = readFileSync(path.join(migrationsDir, "002_task.sql"), "utf8");
  await client.executeMultiple(task);

  const count = (await client.execute("SELECT count(*) AS n FROM member")).rows[0].n;
  assert.equal(Number(count), 2);

  client.close();
});

test("task テーブルの列定義が仕様どおり", async () => {
  const client = await createMigratedClient();
  const columns = (await client.execute("PRAGMA table_info('task')")).rows;

  const expectedNotNull = [
    "category_major",
    "category_mid",
    "title",
    "kind",
    "frequency_label",
    "recurrence",
    "criteria_lv1",
    "criteria_lv2",
    "assignee",
    "agreed_level",
    "active",
  ];
  for (const name of expectedNotNull) {
    const col = columnByName(columns, name);
    assert.ok(col, `列 ${name} が存在しない`);
    assert.equal(col.notnull, 1, `列 ${name} は NOT NULL であるべき`);
  }

  const expectedNullable = ["times_per_period", "trigger_note", "next_due_on"];
  for (const name of expectedNullable) {
    const col = columnByName(columns, name);
    assert.ok(col, `列 ${name} が存在しない`);
    assert.equal(col.notnull, 0, `列 ${name} は NULL 許容であるべき`);
  }

  const id = columnByName(columns, "id");
  assert.equal(id.type, "INTEGER");
  assert.equal(id.pk, 1);

  const assignee = columnByName(columns, "assignee");
  assert.equal(assignee.dflt_value, "'未割当'");

  const agreedLevel = columnByName(columns, "agreed_level");
  assert.equal(agreedLevel.dflt_value, "'未合意'");

  const active = columnByName(columns, "active");
  assert.equal(Number(active.dflt_value), 1);

  client.close();
});

function baseTask(overrides = {}) {
  return {
    category_major: "A. 食事",
    category_mid: "調理",
    title: "テスト用タスク",
    kind: "実作業",
    frequency_label: "週次",
    recurrence: "weekly",
    criteria_lv1: "最低限できている",
    criteria_lv2: "望ましい状態",
    ...overrides,
  };
}

async function insertTask(client, t) {
  return client.execute({
    sql: `INSERT INTO task
      (category_major, category_mid, title, kind, frequency_label, recurrence,
       times_per_period, trigger_note, criteria_lv1, criteria_lv2, assignee,
       agreed_level, next_due_on, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      t.category_major,
      t.category_mid,
      t.title,
      t.kind,
      t.frequency_label,
      t.recurrence,
      t.times_per_period ?? null,
      t.trigger_note ?? null,
      t.criteria_lv1,
      t.criteria_lv2,
      t.assignee ?? "未割当",
      t.agreed_level ?? "未合意",
      t.next_due_on ?? null,
      t.active ?? 1,
    ],
  });
}

test("正しい値の task は挿入できる", async () => {
  const client = await createMigratedClient();
  await assert.doesNotReject(() => insertTask(client, baseTask()));
  client.close();
});

test("不正な recurrence の値は拒否される", async () => {
  const client = await createMigratedClient();
  await assert.rejects(() => insertTask(client, baseTask({ recurrence: "yearly" })));
  client.close();
});

test("不正な assignee の値は拒否される", async () => {
  const client = await createMigratedClient();
  await assert.rejects(() => insertTask(client, baseTask({ assignee: "祖父母" })));
  client.close();
});

test("recurrence が per_use/event/ad_hoc のとき next_due_on を持てない", async () => {
  const client = await createMigratedClient();
  await assert.rejects(() =>
    insertTask(client, baseTask({ recurrence: "event", next_due_on: "2026-01-01" }))
  );
  client.close();
});
