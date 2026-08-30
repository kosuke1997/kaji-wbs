# kaji-wbs — デザイントークン

`ux-designer` と `implementer` はここにある値だけを使う。
**ここにない色・余白・サイズを発明することを禁止する。**

横断の原則: [hq/design-principles.md](../../../hq/design-principles.md)

> テンプレート。実際のプロダクトの値に置き換えること。
> 既に CSS 変数 / Tailwind config がある場合は、**それを正とし、この表をそれに合わせる**。
> 2箇所に別々の値が存在する状態が最悪。

## カラー

| トークン | 用途 | Light | Dark |
|---|---|---|---|
| `--color-bg` | ページ背景 | `#ffffff` | `#0b0d10` |
| `--color-surface` | カード・パネル | `#f7f8fa` | `#15181d` |
| `--color-border` | 罫線 | `#e2e5ea` | `#2a2f37` |
| `--color-text` | 本文 | `#14171a` | `#e8eaed` |
| `--color-text-muted` | 補助テキスト | `#5b6472` | `#9aa4b2` |
| `--color-primary` | 主要アクション | `#2563eb` | `#60a5fa` |
| `--color-primary-text` | primary上の文字 | `#ffffff` | `#0b0d10` |
| `--color-danger` | 破壊的操作・エラー | `#c62828` | `#f87171` |
| `--color-success` | 成功 | `#1b7f3b` | `#4ade80` |

`--color-text-muted` を本文サイズで背景に載せる場合、
**コントラスト比 4.5:1 を満たすことを確認してから使う**（design-qa が実測する）。

## 余白（4pxグリッド）

| トークン | 値 |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-12` | 48px |

## タイポグラフィ

| トークン | サイズ / 行間 | 用途 |
|---|---|---|
| `--text-caption` | 12px / 1.5 | 注釈 |
| `--text-body` | 16px / 1.6 | 本文（最小の本文サイズ。14px 未満を本文に使わない） |
| `--text-title` | 20px / 1.4 | セクション見出し |
| `--text-heading` | 28px / 1.3 | 画面見出し |

## 形状・その他

| トークン | 値 |
|---|---|
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-full` | 9999px |
| `--shadow-card` | `0 1px 2px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.06)` |
| `--duration` | 180ms |
| `--easing` | `cubic-bezier(.2,.7,.3,1)` |
| `--tap-min` | 44px（操作要素の最小サイズ） |

## 既存コンポーネントのインベントリ

`ux-designer` が「新規に作る前に既存を再利用できないか」を判断するための一覧。
**コンポーネントを追加したら、ここに1行足す。** ここが古いと一貫性が壊れる。

| コンポーネント | パス | 用途 |
|---|---|---|
| `Button` | `src/components/Button.tsx` | primary / secondary / danger |
| `SettingRow` | `src/components/SettingRow.tsx` | ラベル + 操作要素の1行 |
| `Toast` | `src/components/Toast.tsx` | success / error の一時通知 |
| `EmptyState` | `src/components/EmptyState.tsx` | 空状態。見出し + 説明 + 次のアクション |
| `Skeleton` | `src/components/Skeleton.tsx` | 読込中のプレースホルダ |
