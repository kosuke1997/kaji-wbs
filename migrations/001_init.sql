-- 初期スキーマ。
-- 以降のマイグレーションは追加的な変更のみ（新規テーブル / NULL許容カラム）。
-- DROP / TRUNCATE / NOT NULL の後付けを書くと CI の
-- Guard destructive migrations が必ずジョブを落とす。

CREATE TABLE IF NOT EXISTS app_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schema_version', '1');
