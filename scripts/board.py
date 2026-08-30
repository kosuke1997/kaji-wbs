"""並列パイプラインの共有ボード `.autopilot/board.json` を読み書きする。

各部署はここに自分の報告を書き、orchestrator が全部を読んで次を決める。
JSON を手で組み立てさせると、1文字の壊れで全ラウンドが止まる。
必ずこのスクリプト経由で触ること。

使い方:
  python scripts/board.py init      --issue 1
  python scripts/board.py plan      --roles pm-triage,ux-designer --skip researcher=理由
  python scripts/board.py report    --role pm-triage --status done --verdict 採用 \
                                    --summary "..." --question "..." --url "https://..."
  python scripts/board.py tasks     --json '[{"id":"t1",...}]'
  python scripts/board.py decide    --text "..."
  python scripts/board.py block     --reason "..."
  python scripts/board.py round     --next
  python scripts/board.py get       --path reports.pm-triage.verdict
  python scripts/board.py show
"""
import argparse
import io
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BOARD = ".autopilot/board.json"

EMPTY = {
    "issue": None,
    "round": 1,
    "phase": "plan",
    "plan": {"analysis_roles": [], "skipped": {}},
    "reports": {},
    "impl_tasks": [],
    "decisions": [],
    "blocked": None,
}


def load():
    if not os.path.exists(BOARD):
        return dict(EMPTY)
    try:
        return json.load(io.open(BOARD, encoding="utf-8"))
    except json.JSONDecodeError as e:
        # 壊れたボードで動き続けると、どの報告が失われたか分からなくなる。
        print(f"board.json が壊れています: {e}", file=sys.stderr)
        raise SystemExit(1)


def save(b):
    os.makedirs(os.path.dirname(BOARD), exist_ok=True)
    io.open(BOARD, "w", encoding="utf-8", newline="\n").write(
        json.dumps(b, ensure_ascii=False, indent=2) + "\n"
    )


def cmd_init(a):
    b = load()
    b["issue"] = a.issue
    if not b.get("round"):
        b["round"] = 1
    save(b)
    print(f"board: Issue #{a.issue} / round {b['round']}")


def cmd_plan(a):
    b = load()
    b["plan"]["analysis_roles"] = [r.strip() for r in a.roles.split(",") if r.strip()]
    for s in a.skip or []:
        if "=" not in s:
            print(f"--skip は role=理由 の形式で指定してください: {s}", file=sys.stderr)
            raise SystemExit(2)
        role, reason = s.split("=", 1)
        b["plan"]["skipped"][role.strip()] = reason.strip()
    b["phase"] = "analyze"
    save(b)
    print("board: 分析ラウンドの割り当てを記録しました")
    print("  動かす:", ", ".join(b["plan"]["analysis_roles"]))
    for k, v in b["plan"]["skipped"].items():
        print(f"  飛ばす: {k} — {v}")


def cmd_report(a):
    b = load()
    b["reports"][a.role] = {
        "status": a.status,
        "verdict": a.verdict,
        "summary": a.summary,
        "questions": a.question or [],
        "url": a.url,
        "round": b["round"],
    }
    save(b)
    print(f"board: {a.role} の報告を記録しました（{a.status} / {a.verdict}）")


def cmd_tasks(a):
    b = load()
    try:
        tasks = json.loads(a.json)
    except json.JSONDecodeError as e:
        print(f"--json が JSON として読めません: {e}", file=sys.stderr)
        raise SystemExit(2)

    # files が重なるタスクを同時に走らせると、統合時に必ず壊れる。
    # 分割した本人に気づかせるため、ここで弾く。
    seen = {}
    for t in tasks:
        for key in ("id", "title", "files"):
            if key not in t:
                print(f"タスクに {key} がありません: {t}", file=sys.stderr)
                raise SystemExit(2)
        for f in t["files"]:
            if f in seen and not t.get("depends_on"):
                print(
                    f"タスク {seen[f]} と {t['id']} が同じファイル {f} を触ります。"
                    "分割し直すか depends_on を設定してください。",
                    file=sys.stderr,
                )
                raise SystemExit(2)
            seen[f] = t["id"]

    b["impl_tasks"] = tasks
    b["phase"] = "implement"
    save(b)
    print(f"board: 実装タスク {len(tasks)} 件を記録しました")
    for t in tasks:
        dep = f" (依存: {','.join(t.get('depends_on', []))})" if t.get("depends_on") else ""
        print(f"  {t['id']}: {t['title']}{dep}")


def cmd_decide(a):
    b = load()
    b["decisions"].append({"round": b["round"], "by": "orchestrator", "text": a.text})
    save(b)
    print("board: 判断を記録しました")


def cmd_block(a):
    b = load()
    b["blocked"] = {"round": b["round"], "reason": a.reason}
    save(b)
    print(f"board: 停止しました — {a.reason}")


def cmd_round(a):
    b = load()
    if a.next:
        b["round"] += 1
        b["reports"] = {}  # 前ラウンドの報告は decisions に残っている
        save(b)
    print(b["round"])


def cmd_get(a):
    b = load()
    cur = b
    for part in a.path.split("."):
        if isinstance(cur, dict):
            cur = cur.get(part)
        else:
            cur = None
        if cur is None:
            break
    print(json.dumps(cur, ensure_ascii=False) if not isinstance(cur, str) else cur)


def cmd_merge(a):
    """並列ジョブが出した報告を1つのボードに取り込む。

    並列ジョブが同じ board.json へ同時に書くと壊れるため、各部署は
    自分の報告だけを別ファイルに出し、司令塔がここでまとめて取り込む。
    """
    b = load()
    merged = []
    for root, _dirs, files in os.walk(a.dir):
        for f in sorted(files):
            if not f.endswith(".json"):
                continue
            path = os.path.join(root, f)
            try:
                part = json.load(io.open(path, encoding="utf-8"))
            except json.JSONDecodeError as e:
                # 1つ壊れていても他の報告は取り込む。ただし黙って捨てない。
                print(f"  読めません（無視）: {path} — {e}", file=sys.stderr)
                continue
            for role, rep in (part.get("reports") or {}).items():
                b["reports"][role] = rep
                merged.append(role)

    save(b)
    if merged:
        print("board: 取り込みました —", ", ".join(sorted(set(merged))))
    else:
        print("board: 取り込む報告がありませんでした", file=sys.stderr)


def cmd_show(a):
    b = load()
    print(json.dumps(b, ensure_ascii=False, indent=2))


def main():
    p = argparse.ArgumentParser(description="並列パイプラインの共有ボード")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("init")
    s.add_argument("--issue", type=int, required=True)
    s.set_defaults(fn=cmd_init)

    s = sub.add_parser("plan")
    s.add_argument("--roles", required=True, help="カンマ区切り")
    s.add_argument("--skip", action="append", help="role=理由")
    s.set_defaults(fn=cmd_plan)

    s = sub.add_parser("report")
    s.add_argument("--role", required=True)
    s.add_argument("--status", required=True, choices=["done", "blocked", "skipped"])
    s.add_argument("--verdict", required=True)
    s.add_argument("--summary", required=True)
    s.add_argument("--question", action="append")
    s.add_argument("--url", default="")
    s.set_defaults(fn=cmd_report)

    s = sub.add_parser("tasks")
    s.add_argument("--json", required=True)
    s.set_defaults(fn=cmd_tasks)

    s = sub.add_parser("decide")
    s.add_argument("--text", required=True)
    s.set_defaults(fn=cmd_decide)

    s = sub.add_parser("block")
    s.add_argument("--reason", required=True)
    s.set_defaults(fn=cmd_block)

    s = sub.add_parser("round")
    s.add_argument("--next", action="store_true")
    s.set_defaults(fn=cmd_round)

    s = sub.add_parser("get")
    s.add_argument("--path", required=True, help="例 reports.pm-triage.verdict")
    s.set_defaults(fn=cmd_get)

    s = sub.add_parser("merge")
    s.add_argument("--dir", required=True, help="並列ジョブの報告 json が入ったディレクトリ")
    s.set_defaults(fn=cmd_merge)

    s = sub.add_parser("show")
    s.set_defaults(fn=cmd_show)

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
