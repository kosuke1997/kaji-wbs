"""Issue コメントから部署の報告を拾い、ボードに記録する。

各部署に `board.py report` を実行させる設計にしていたが、実運用で漏れた。
実際に起きたこと:
  - settings.json が python の実行を許可しておらず、部署は正しく実行を拒んだ
  - 別の部署は2ターンで終わり、何も記録しなかった

**記録をエージェントの善意に依存させない。** 部署は Issue にコメントする
（これは確実に行われる）。その結果をワークフロー側が機械的に拾って記録する。

  python scripts/record-report.py --role pm-triage --issue 2 --repo owner/name
"""
import argparse
import json
import os
import re
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

GH = os.environ.get("GH_BIN", "gh")

# 各部署の出力フォーマットから判定を拾う
VERDICT_RE = re.compile(
    r"\*\*判定[:：]\*\*\s*([^\n/]+?)(?:\s*/|\s*$)|判定[:：]\s*([^\n/]+?)(?:\s*/|\s*$)"
)


def gh_json(*args):
    r = subprocess.run(
        [GH, *args], capture_output=True, text=True, encoding="utf-8", timeout=60
    )
    if r.returncode != 0:
        print(f"gh 失敗: {r.stderr.strip()[:200]}", file=sys.stderr)
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return None


def board(*args):
    subprocess.run([sys.executable, "scripts/board.py", *args], check=False)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--role", required=True)
    p.add_argument("--issue", required=True)
    p.add_argument("--repo", required=True)
    a = p.parse_args()

    comments = gh_json("api", f"repos/{a.repo}/issues/{a.issue}/comments?per_page=100")
    if comments is None:
        board("report", "--role", a.role, "--status", "blocked",
              "--verdict", "不明", "--summary", "Issue コメントを取得できませんでした")
        return

    # その部署の見出しを持つコメントを新しい順に探す
    mine = [c for c in comments if f"({a.role})" in c.get("body", "")
            or c.get("body", "").startswith(f"## {a.role}")]

    if not mine:
        # 発言していない = 仕事をしていない。「問題なし」と誤読させない。
        board("report", "--role", a.role, "--status", "blocked",
              "--verdict", "未報告",
              "--summary", f"{a.role} は Issue に何も書き残しませんでした。"
                           "確認できなかった項目は不合格として扱います。")
        print(f"{a.role}: コメントなし -> blocked として記録")
        return

    latest = mine[-1]
    body = latest["body"]

    m = VERDICT_RE.search(body)
    # 見出しの ** が判定文字列に混ざるので落とす
    verdict = (m.group(1) or m.group(2)).strip().strip("*").strip() if m else "記載なし"

    # 見出しを除いた最初の実質行を要約に使う
    lines = [l.strip() for l in body.splitlines()
             if l.strip() and not l.strip().startswith("#")]
    summary = " / ".join(lines[:3])[:400] if lines else "（本文なし）"

    args = ["report", "--role", a.role, "--status", "done",
            "--verdict", verdict, "--summary", summary,
            "--url", latest["html_url"]]

    # 「聞きたいこと」を質問として拾い、司令塔に渡す
    for q in re.findall(r"\*\*聞きたいこと[:：]?\*\*\s*(.+)", body):
        args += ["--question", q.strip()[:300]]
    for q in re.findall(r"判断してほしいこと\s*\(?\d*\)?[:：]\s*(.+)", body):
        args += ["--question", q.strip()[:300]]

    board(*args)
    print(f"{a.role}: {verdict} -> 記録しました（{len(mine)}件のコメントから最新を採用）")


if __name__ == "__main__":
    main()
