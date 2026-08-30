#!/usr/bin/env bash
# PR のコミットに対応する Vercel Preview デプロイが READY になるまで待ち、URL を返す。
#
# 必要な環境変数:
#   VERCEL_TOKEN       Vercel のアクセストークン
#   VERCEL_PROJECT_ID  対象プロジェクトID
#   VERCEL_TEAM_ID     (任意) Team に属する場合
#   COMMIT_SHA         PR の HEAD SHA
#
# 出力: 標準出力に "https://xxx.vercel.app"、GITHUB_OUTPUT があれば url= も書く
set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"
: "${COMMIT_SHA:?COMMIT_SHA is required}"

TEAM_QS=""
[ -n "${VERCEL_TEAM_ID:-}" ] && TEAM_QS="&teamId=${VERCEL_TEAM_ID}"

API="https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&target=preview&limit=20&meta-githubCommitSha=${COMMIT_SHA}${TEAM_QS}"

DEADLINE=$(( $(date +%s) + 300 ))   # 最大5分待つ。取れなければ失敗させる。

while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  RESP=$(curl -fsS -H "Authorization: Bearer ${VERCEL_TOKEN}" "$API")

  STATE=$(printf '%s' "$RESP" | jq -r '.deployments[0].state // .deployments[0].readyState // "NONE"')
  URL=$(printf '%s' "$RESP"   | jq -r '.deployments[0].url // ""')

  case "$STATE" in
    READY)
      [ -n "$URL" ] || { echo "READY だが URL が空です" >&2; exit 1; }
      echo "https://${URL}"
      [ -n "${GITHUB_OUTPUT:-}" ] && echo "url=https://${URL}" >> "$GITHUB_OUTPUT"
      exit 0
      ;;
    ERROR|CANCELED)
      echo "::error::Vercel Preview デプロイが ${STATE} で終了しました" >&2
      exit 1
      ;;
    *)
      echo "waiting for preview... state=${STATE}" >&2
      sleep 10
      ;;
  esac
done

echo "::error::5分以内に Preview デプロイが READY になりませんでした。マージしません。" >&2
exit 1
