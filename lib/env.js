/**
 * 必須の環境変数を取得する。未設定なら例外を投げる。
 * turso.js から独立させてあるのは、DB接続なしでテストできるようにするため。
 */
export function requireEnv(name, env = process.env) {
  const v = env[name];
  if (v === undefined || v === "") {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return v;
}
