#!/usr/bin/env bash
# 直前の Production Deployment に戻す。
#
# 必要な環境変数:
#   VERCEL_TOKEN / VERCEL_PROJECT_ID / (任意) VERCEL_TEAM_ID
set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required}"

TEAM_QS=""
[ -n "${VERCEL_TEAM_ID:-}" ] && TEAM_QS="?teamId=${VERCEL_TEAM_ID}"
TEAM_AMP=""
[ -n "${VERCEL_TEAM_ID:-}" ] && TEAM_AMP="&teamId=${VERCEL_TEAM_ID}"

# READY な production デプロイを新しい順に取得し、2件目（＝直前）を選ぶ
LIST=$(curl -fsS -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&target=production&state=READY&limit=5${TEAM_AMP}")

PREV_ID=$(printf '%s' "$LIST" | jq -r '.deployments[1].uid // empty')
PREV_URL=$(printf '%s' "$LIST" | jq -r '.deployments[1].url // empty')

if [ -z "$PREV_ID" ]; then
  echo "::error::戻せる直前のProductionデプロイが見つかりません。手動対応が必要です。" >&2
  exit 1
fi

echo "rolling back to ${PREV_ID} (${PREV_URL})"

curl -fsS -X POST \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/rollback/${PREV_ID}${TEAM_QS}"

echo ""
echo "rollback requested: ${PREV_ID}"
[ -n "${GITHUB_OUTPUT:-}" ] && {
  echo "rolled_back_to=${PREV_ID}" >> "$GITHUB_OUTPUT"
  echo "rolled_back_url=https://${PREV_URL}" >> "$GITHUB_OUTPUT"
}
