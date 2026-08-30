import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

function loadDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("migrations/001_init.sql", "utf8"));
  db.exec(readFileSync("migrations/002_task.sql", "utf8"));
  db.exec(readFileSync("migrations/003_seed_tasks.sql", "utf8"));
  return db;
}

// Issue #1 のオーナー確定表（「回答(2)」コメント）の45件をそのまま転記する。
// id ごとに frequency_label / recurrence / times_per_period / criteria_lv1 / criteria_lv2 が
// 一字一句・1件も相違なく一致することを検証する。
const expected = [
  [1, "週次", "weekly", 1, "締切までに確定させる（内容はお任せでも可）", "翌週の在宅日を確認し、人数分のメニューを選んで確定する"],
  [2, "週次", "weekly", 1, "その日のうちに冷蔵・冷凍に仕分ける", "到着後すぐ仕分け、期限順に並べて配置する"],
  [3, "週3〜4回", "weekly", 3, "レシピどおり最短で作る", "レシピどおり＋盛り付け、必要なら副菜を1品足す"],
  [4, "二人で食べる日", "event", null, "その日のうちにシンクを空にする", "食後1時間以内にシンクを空にする"],
  [5, "毎日", "daily", 1, "調理後に目立つ汚れを拭く／ネットは汚れたら交換", "毎回拭き上げる＋排水口ネットは毎日交換"],
  [6, "週次", "weekly", 1, "注文・買い出しの前に中身をひと通り見る", "週1回リスト化し、使い切り前提で注文数量を決める"],
  [7, "毎日", "daily", 1, "その日のうちに袋に入れて口を縛る", "水切りして冷凍保管し、収集日に出す"],
  [8, "週3〜4回", "weekly", 3, "自分の分は自分で完結させる（畳まずしまうのも可）", "その日のうちに畳んでしまい、洗濯機を空ける"],
  [9, "月2回", "monthly", 2, "各自で分けて洗い、部屋干しする", "素材ごとに洗い分け、干し場を当日中に空ける"],
  [10, "毎回", "per_use", null, "自分が回した分は、運転後に必ず取る", "毎回取る＋週1回は水洗いする"],
  [11, "月次", "monthly", 1, "月1回（排水フィルター＋槽洗浄）", "月1回＋ゴムパッキンの拭き取りは週1回"],
  [12, "隔週", "biweekly", 1, "隔週で洗う", "毎週洗う"],
  [13, "週次", "weekly", 1, "週1回", "枕カバーは週2回"],
  [14, "週1回", "weekly", 1, "週1回", "バスマットは週2回、布巾は毎日交換"],
  [15, "季節ごと", "quarterly", 1, "半年に1回（乾燥・カバー交換）", "3ヶ月ごと＋年1回はクリーニングに出す"],
  [16, "月次", "monthly", 1, "各自で出す", "まとめて宅配クリーニングに外注する"],
  [17, "週2〜3回", "weekly", 2, "稼働前に床の物をどける", "椅子上げ・コード類・ラグまで含めて床を空ける"],
  [18, "週2〜3回", "weekly", 2, "曜日を決めて自動運転にする", "部屋別に運転計画を組み、稼働結果を確認する"],
  [19, "週1〜2回", "weekly", 1, "週1回まとめて", "毎回の稼働後"],
  [20, "3ヶ月ごと", "quarterly", 1, "3ヶ月ごとに交換する", "予備を常備し、交換月を管理する"],
  [21, "週1回", "weekly", 1, "週1回（脱衣所・部屋の隅）", "週1回＋家具の下と家具を動かして"],
  [22, "週1回", "weekly", 1, "週1回（便器・床）", "週2回＋壁・タンクまで"],
  [23, "毎日", "daily", 1, "入浴後に毎日こする", "毎日こする＋壁・床も流す"],
  [24, "週1回", "weekly", 1, "週1回で髪を取る", "週1回＋防カビ燻煙を月1回"],
  [25, "週1回", "weekly", 1, "週1回で鏡・ボウル", "週1回＋排水口・小物まで"],
  [26, "月次", "monthly", 1, "月1回掃く", "月1回＋手すり拭き・排水溝の清掃"],
  [27, "週1回", "weekly", 1, "週1回掃き掃除＋靴を下駄箱に戻す", "週1回＋たたきの水拭き"],
  [28, "季節ごと", "quarterly", 1, "半年に1回", "3ヶ月に1回"],
  [29, "月次", "monthly", 1, "月1回・全台", "隔週・全台"],
  [30, "季節ごと", "quarterly", 1, "半年に1回", "3ヶ月に1回"],
  [31, "週2回", "weekly", 2, "毎回の収集日に、朝8時までに出す", "前夜に玄関へ準備し、当日出す"],
  [32, "週1回", "weekly", 1, "毎週出す", "洗って乾かして保管し、毎週出す"],
  [33, "週1回", "weekly", 1, "毎週出す", "洗って乾かして、毎週出す"],
  [34, "週1回", "weekly", 1, "その週のうちに解体する", "到着後すぐ解体し、回収日に必ず出す"],
  [35, "都度", "ad_hoc", null, "不要と決めてから1ヶ月以内に申し込む", "不要と決めた週のうちに手配する"],
  [36, "週1回", "weekly", 1, "週1回まとめて確認する", "残量で発注点を決めて管理する"],
  [37, "月2回", "monthly", 2, "月2回まとめて買う", "定期便で自動化する"],
  [38, "都度", "ad_hoc", null, "使い切った人がその場で補充する", "残り1個になった時点で補充する"],
  [39, "月次", "monthly", 1, "月1回集計する", "費目別に予実を比較する"],
  [40, "月次", "monthly", 1, "月1回まとめて精算する", "共通口座で自動化する"],
  [41, "2年ごと", "biennial", 1, "通知後2週間以内に対応する", "更新月をカレンダーに登録し、先回りして動く"],
  [42, "都度", "ad_hoc", null, "届いた週のうちに対応する", "期限管理表を作り、先回りして対応する"],
  [43, "都度", "ad_hoc", null, "気づいた週のうちに交換する", "予備を常備して、切れたら即交換する"],
  [44, "季節ごと", "quarterly", 1, "季節の変わり目に入れ替える", "収納・防虫まで含めて計画的に行う"],
  [45, "週1回", "weekly", 1, "週1回", "土の状態を見て頻度を調整する"],
];

test("45件全てが仕様表（Issue #1 オーナー確定表）と完全一致する", () => {
  const db = loadDb();

  assert.equal(db.prepare("SELECT COUNT(*) c FROM task").get().c, 45);

  for (const [id, frequencyLabel, recurrence, timesPerPeriod, lv1, lv2] of expected) {
    const row = db
      .prepare(
        "SELECT frequency_label, recurrence, times_per_period, criteria_lv1, criteria_lv2 FROM task WHERE id = ?"
      )
      .get(id);
    assert.equal(row.frequency_label, frequencyLabel, `id=${id} frequency_label`);
    assert.equal(row.recurrence, recurrence, `id=${id} recurrence`);
    assert.equal(row.times_per_period, timesPerPeriod, `id=${id} times_per_period`);
    assert.equal(row.criteria_lv1, lv1, `id=${id} criteria_lv1`);
    assert.equal(row.criteria_lv2, lv2, `id=${id} criteria_lv2`);
  }
});

test("per_use / event / ad_hoc の6件は times_per_period と next_due_on がともに NULL", () => {
  const db = loadDb();
  const rows = db
    .prepare(
      "SELECT id FROM task WHERE recurrence IN ('per_use','event','ad_hoc') AND times_per_period IS NULL AND next_due_on IS NULL ORDER BY id"
    )
    .all()
    .map((r) => r.id);
  assert.deepEqual(rows, [4, 10, 35, 38, 42, 43]);
});

test("投入直後は45件すべて 未割当 / 未合意 / active=1", () => {
  const db = loadDb();
  const count = db
    .prepare("SELECT COUNT(*) c FROM task WHERE assignee='未割当' AND agreed_level='未合意' AND active=1")
    .get().c;
  assert.equal(count, 45);
});

test("member は id=1 夫、id=2 妻 の2件", () => {
  const db = loadDb();
  const members = db
    .prepare("SELECT id, label FROM member ORDER BY id")
    .all()
    .map((r) => ({ id: r.id, label: r.label }));
  assert.deepEqual(members, [
    { id: 1, label: "夫" },
    { id: 2, label: "妻" },
  ]);
});

test("002 / 003 を2回続けて適用しても件数が変わらない（冪等）", () => {
  const db = loadDb();
  db.exec(readFileSync("migrations/002_task.sql", "utf8"));
  db.exec(readFileSync("migrations/003_seed_tasks.sql", "utf8"));

  assert.equal(db.prepare("SELECT COUNT(*) c FROM task").get().c, 45);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM member").get().c, 2);
});

test("kind に不正な値を INSERT すると CHECK 制約で失敗する", () => {
  const db = loadDb();
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO task (id, category_major, category_mid, title, kind, frequency_label, recurrence, criteria_lv1, criteria_lv2) VALUES (901,'X','Y','Z','不正','週次','weekly','a','b')"
      )
      .run()
  );
});

test("assignee に不正な値を INSERT すると CHECK 制約で失敗する", () => {
  const db = loadDb();
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO task (id, category_major, category_mid, title, kind, frequency_label, recurrence, criteria_lv1, criteria_lv2, assignee) VALUES (902,'X','Y','Z','実作業','週次','weekly','a','b','不正')"
      )
      .run()
  );
});

test("agreed_level に不正な値を INSERT すると CHECK 制約で失敗する", () => {
  const db = loadDb();
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO task (id, category_major, category_mid, title, kind, frequency_label, recurrence, criteria_lv1, criteria_lv2, agreed_level) VALUES (903,'X','Y','Z','実作業','週次','weekly','a','b','不正')"
      )
      .run()
  );
});

test("recurrence に不正な値を INSERT すると CHECK 制約で失敗する", () => {
  const db = loadDb();
  assert.throws(() =>
    db
      .prepare(
        "INSERT INTO task (id, category_major, category_mid, title, kind, frequency_label, recurrence, criteria_lv1, criteria_lv2) VALUES (904,'X','Y','Z','実作業','週次','unknown','a','b')"
      )
      .run()
  );
});
