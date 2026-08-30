import { getTurso } from "../../../lib/turso.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * qa-tester / design-qa / deploy-agent がこのエンドポイントで合否を判定する。
 *
 * DB接続を含む実際の疎通を確認し、正常時のみ 200 を返すこと。
 * 常に 200 を返す実装にすると、スモークテストと本番検証の関門が同時に無効になる。
 */
export async function GET() {
  try {
    await getTurso().execute("SELECT 1");
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message ?? e) }, { status: 503 });
  }
}
