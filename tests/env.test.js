import { test } from "node:test";
import assert from "node:assert/strict";
import { requireEnv } from "../lib/env.js";

test("設定済みの環境変数を返す", () => {
  assert.equal(requireEnv("FOO", { FOO: "bar" }), "bar");
});

test("未設定なら例外を投げる", () => {
  assert.throws(() => requireEnv("FOO", {}), /FOO/);
});

test("空文字は未設定として扱う", () => {
  assert.throws(() => requireEnv("FOO", { FOO: "" }), /FOO/);
});
