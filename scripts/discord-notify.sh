#!/usr/bin/env bash
# 各部署の発言を Discord に流す。
#
#   scripts/discord-notify.sh <webhook_url> <title> <body> [url] [department]
#
# 部署ごとに色と絵文字を変え、どの部署が何を言ったかがチャンネルを見るだけで分かるようにする。
# 承認を外すことと記録を残さないことは別の話であり、これはその「見える化」側の実装。
set -euo pipefail

WEBHOOK="${1:?webhook url}"
TITLE="${2:?title}"
BODY="${3:-}"
URL="${4:-}"
DEPT="${5:-}"

# Discord の embed description は 4096 文字まで。超える分は切る。
MAX=3800

case "$DEPT" in
  pm-triage|product-planner|solution-architect) COLOR=3447003;  ICON="🧭" ;;  # 青 / PM部
  ux-designer|design-qa)                        COLOR=15277667; ICON="🎨" ;;  # 桃 / デザイン部
  implementer|rnd-engineer)                     COLOR=3066993;  ICON="🔧" ;;  # 緑 / エンジニア・R&D
  code-reviewer|qa-tester)                      COLOR=15844367; ICON="🔍" ;;  # 金 / 品質管理部
  legal-reviewer)                               COLOR=10038562; ICON="⚖️" ;;  # 赤紫 / 法務
  researcher)                                   COLOR=1752220;  ICON="📚" ;;  # 水 / リサーチ
  deploy-agent)                                 COLOR=2895667;  ICON="🚀" ;;  # 藍 / 運用
  portfolio-manager)                            COLOR=9807270;  ICON="📊" ;;  # 灰 / 経営企画
  incident|failure)                             COLOR=15158332; ICON="🚨" ;;  # 赤
  needs-human)                                  COLOR=15105570; ICON="🙋" ;;  # 橙
  *)                                            COLOR=9807270;  ICON="•"  ;;
esac

# jq に任せて必ず正しい JSON にする。手で組むと本文の " や改行で壊れる。
PAYLOAD=$(jq -n \
  --arg title "${ICON} ${TITLE}" \
  --arg body "$(printf '%s' "$BODY" | head -c "$MAX")" \
  --arg url "$URL" \
  --arg dept "${DEPT:-organization}" \
  --argjson color "$COLOR" \
  '{
     embeds: [
       ( {
           title: $title,
           description: $body,
           color: $color,
           footer: { text: $dept }
         }
         + ( if $url == "" then {} else { url: $url } end ) )
     ]
   }')

# payload はファイル経由で渡す。理由は2つ。
#  1. 改行を含む JSON をコマンド引数（-d）で渡すと、Windows(MSYS)では引数が
#     変換されて壊れ、Discord が 400（invalid JSON）を返す
#  2. tr で CR を落とせる。Windows 版 jq は改行を CRLF で出力するため、
#     そのまま送ると Discord に弾かれる
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
printf '%s' "$PAYLOAD" | tr -d '\r' > "$TMP"

# 通知の失敗で本体のパイプラインを止めない。
# 記録は残したいが、Discord が落ちていることは開発の失敗ではない。
if ! curl -fsS -X POST -H "Content-Type: application/json" \
     --data-binary "@$TMP" "$WEBHOOK" > /dev/null; then
  echo "::warning::Discord への通知に失敗しました（処理は継続します）"
fi
