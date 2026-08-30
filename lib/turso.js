import { createClient } from "@libsql/client";
import { requireEnv } from "./env.js";

let client;

/**
 * Turso クライアントを遅延生成する。
 *
 * モジュール読み込み時に接続情報を要求すると、環境変数が入っていない状況
 * （next build の静的解析、テスト、CI）でモジュールを読んだだけで落ちる。
 * 実際に問い合わせる時点まで生成を遅らせる。
 */
export function getTurso() {
  if (!client) {
    client = createClient({
      url: requireEnv("TURSO_DATABASE_URL"),
      authToken: requireEnv("TURSO_AUTH_TOKEN"),
    });
  }
  return client;
}
