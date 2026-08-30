-- 初期スキーマ。
-- 以降のマイグレーションは追加的な変更のみ（新規テーブル / NULL許容カラム）。
-- 破壊的な DDL（テーブルや列の削除、全行削除、既存列への非NULL制約の後付け）を
-- 書くと、CI の Guard destructive migrations が必ずジョブを落とす。
-- 必要な場合は needs-human ラベルを付けて人の判断を仰ぐこと。

CREATE TABLE IF NOT EXISTS app_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '1');
