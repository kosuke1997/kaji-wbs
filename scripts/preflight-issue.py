"""Issue を起票する前に、パイプラインが確実に走る状態かを検査する。

無人パイプラインは1回の実行が高い（実測: 直列版1回で $9、サブスク運用なら
利用枠を数十ターンぶん消費する）。**起動してから気づく**のが最大の無駄なので、
起票前に落とせるものは全部ここで落とす。

実際に踏んだ失敗のうち、6回中4回はここで検出できたものだった。

  python scripts/preflight-issue.py <owner/repo> [--issue-body <file>]
"""
import argparse
import io
import json
import os
import re
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

GH = os.environ.get("GH_BIN", "gh")

ok_count = 0
ng = []


def check(label, passed, hint=""):
    global ok_count
    if passed:
        ok_count += 1
        print(f"  [OK] {label}")
    else:
        ng.append((label, hint))
        print(f"  [NG] {label}")
        if hint:
            print(f"       → {hint}")


def gh(*args):
    """gh を叩いて stdout を返す。失敗したら None。"""
    try:
        r = subprocess.run(
            [GH, *args], capture_output=True, text=True, encoding="utf-8", timeout=60
        )
        return r.stdout.strip() if r.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def check_secrets(repo):
    print("\n== Secrets / Variables ==")
    out = gh("secret", "list", "--repo", repo) or ""
    names = {line.split()[0] for line in out.splitlines() if line.strip()}

    check(
        "CLAUDE_CODE_OAUTH_TOKEN がある",
        "CLAUDE_CODE_OAUTH_TOKEN" in names,
        "claude setup-token で作り、gh secret set CLAUDE_CODE_OAUTH_TOKEN で配る",
    )
    # API キーが残っていると、OAuth に切り替えたつもりで従量課金に戻る
    check(
        "ANTHROPIC_API_KEY が残っていない",
        "ANTHROPIC_API_KEY" not in names,
        "従量課金の経路。gh secret delete ANTHROPIC_API_KEY で消す",
    )

    vout = gh("variable", "list", "--repo", repo) or ""
    vars_ = {}
    for line in vout.splitlines():
        parts = line.split("\t")
        if len(parts) >= 2:
            vars_[parts[0].strip()] = parts[1].strip()

    check("PROD_URL が設定されている", "PROD_URL" in vars_)
    check(
        "DESIGN_QA_PATHS が壊れていない",
        vars_.get("DESIGN_QA_PATHS", "/").startswith("/"),
        "MSYS がパスを変換した可能性。PowerShell から設定し直す",
    )
    return vars_


def check_workflows(repo, vars_):
    print("\n== ワークフロー ==")
    mode = vars_.get("AUTOPILOT_MODE", "serial")
    print(f"  モード: {mode}")

    wf = "autopilot-parallel.yml" if mode == "parallel" else "autopilot.yml"
    org = repo.split("/")[0]

    body = gh("api", f"repos/{org}/.github/contents/.github/workflows/{wf}")
    check(
        f"{org}/.github に {wf} がある",
        body is not None,
        f"{org}/.github リポジトリに再利用ワークフローを push する",
    )
    if body:
        content = json.loads(body).get("content", "")
        import base64

        text = base64.b64decode(content).decode("utf-8")

        # 実際に踏んだ3つの罠を検査する
        check(
            "allowedTools にサブエージェント起動ツールがある",
            "Task," in text or "Agent," in text,
            "これがないと単一セッションが全部署を演じるだけになる（部署は起動しない）",
        )
        check(
            "id-token: write がある",
            "id-token: write" in text,
            "claude-code-action の OIDC 取得に必要。ないと必ず失敗する",
        )
        check(
            "OAuth トークンを使っている",
            "claude_code_oauth_token" in text,
            "anthropic_api_key のままだと従量課金になる",
        )

    caller = gh("api", f"repos/{repo}/contents/.github/workflows/autopilot.yml")
    if caller:
        import base64

        text = base64.b64decode(json.loads(caller)["content"]).decode("utf-8")
        check(
            "呼び出し側に permissions がある",
            "permissions:" in text,
            "再利用ワークフローは権限を絞ることしかできない。"
            "呼び出し側になければ startup_failure になる",
        )


def check_repo_files(repo):
    print("\n== 判断に必要なファイル ==")
    # hq は別リポジトリで読めないため、複製が置かれていないと各部署が停止する
    for path, who in [
        (".claude/approval-criteria.yaml", "pm-triage"),
        (".claude/design/design-principles.md", "ux-designer"),
        (".claude/design/design-tokens.md", "ux-designer"),
        (".claude/legal-policy.md", "legal-reviewer"),
        (".claude/product-brief.yaml", "全部署"),
    ]:
        check(
            f"{path} がある（{who} の判断根拠）",
            gh("api", f"repos/{repo}/contents/{path}") is not None,
            "hq から複製されていない。scripts/sync-criteria.py と provision.sh を確認",
        )


def check_issue_size(path):
    print("\n== Issue の大きさ ==")
    text = io.open(path, encoding="utf-8").read()

    criteria = len(re.findall(r"^\s*-\s*\[ \]", text, re.M))
    rows = len([l for l in text.splitlines() if l.strip().startswith("|")])
    chars = len(text)

    # 実測: 受け入れ条件9個 + 45行の表で、35ターンを使い切って未完了だった
    check(
        f"受け入れ条件が5個以下（実際: {criteria}個）",
        criteria <= 5,
        "solution-architect の規律を超えている。Issue を分割する",
    )
    check(
        f"表の行数が20行以下（実際: {rows}行）",
        rows <= 20,
        "大量データの投入は別 Issue に切り出す。1回のターン上限で終わらない",
    )
    check(
        f"本文が4000字以下（実際: {chars}字）",
        chars <= 4000,
        "本文が長いほど毎ターンのコンテキストが太る。分割するか外部ファイルに置く",
    )


def main():
    p = argparse.ArgumentParser()
    p.add_argument("repo", help="owner/repo")
    p.add_argument("--issue-body", help="起票予定の本文ファイル")
    a = p.parse_args()

    print(f"起票前チェック: {a.repo}")

    if gh("repo", "view", a.repo, "--json", "name") is None:
        print("\nリポジトリにアクセスできません。gh auth status を確認してください。")
        raise SystemExit(1)

    vars_ = check_secrets(a.repo)
    check_workflows(a.repo, vars_)
    check_repo_files(a.repo)
    if a.issue_body:
        check_issue_size(a.issue_body)

    print(f"\nOK: {ok_count} / NG: {len(ng)}")
    if ng:
        print("\n起票しないでください。下記を解消してから再実行してください。")
        for label, hint in ng:
            print(f"  - {label}")
        raise SystemExit(1)
    print("すべて通りました。起票して問題ありません。")


if __name__ == "__main__":
    main()
