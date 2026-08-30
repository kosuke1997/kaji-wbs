-- 家事タスクの基盤テーブル。新規テーブルの追加のみ。既存の app_meta には触れない。
-- 破壊的な DDL（テーブルや列の削除、全行削除、既存列への非NULL制約の後付け）を
-- 書くと、CI の Guard destructive migrations が必ずジョブを落とす。
-- 必要な場合は needs-human ラベルを付けて人の判断を仰ぐこと。

CREATE TABLE IF NOT EXISTS member (
  id         INTEGER PRIMARY KEY,
  label      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- frequency は単一列で正規化しない。原文（frequency_label）と、次回予定日の
-- 算出に使う計算用の構造（recurrence / times_per_period）を分けて持つ。
-- 原文を失わないため、正規化の判断を後から見直せる。
CREATE TABLE IF NOT EXISTS task (
  id                INTEGER PRIMARY KEY,
  category_major    TEXT NOT NULL,
  category_mid      TEXT NOT NULL,
  title             TEXT NOT NULL,
  kind              TEXT NOT NULL CHECK (kind IN ('実作業', '段取り・管理')),
  frequency_label   TEXT NOT NULL,
  recurrence        TEXT NOT NULL CHECK (
                      recurrence IN (
                        'daily', 'weekly', 'biweekly', 'monthly',
                        'quarterly', 'biennial', 'per_use', 'event', 'ad_hoc'
                      )
                    ),
  times_per_period  INTEGER,
  trigger_note      TEXT,
  criteria_lv1      TEXT NOT NULL,
  criteria_lv2      TEXT NOT NULL,
  assignee          TEXT NOT NULL DEFAULT '未割当' CHECK (
                      assignee IN ('夫', '妻', '共同', '交代', '各自', '外注', '未割当')
                    ),
  agreed_level      TEXT NOT NULL DEFAULT '未合意' CHECK (
                      agreed_level IN ('Lv1', 'Lv2', '未合意')
                    ),
  next_due_on       TEXT,
  active            INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
