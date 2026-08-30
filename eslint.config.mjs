import js from "@eslint/js";
import react from "eslint-plugin-react";

/**
 * ESLint のフラット設定。
 *
 * `next lint` は Next.js 15 で非推奨になり 16 で削除されるため、ESLint を直接使う。
 * 関門として働けばよいので、フレームワーク固有のプラグインには依存しない
 * （バージョン差異でパイプライン全体が止まるのを避ける）。
 */
export default [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "experiments/**", "design-qa-artifacts/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // ブラウザ
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        navigator: "readonly",
        getComputedStyle: "readonly",
        requestAnimationFrame: "readonly",
        matchMedia: "readonly",
        location: "readonly",
        alert: "readonly",
        // 共通（Web標準）
        console: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Response: "readonly",
        Request: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        AbortSignal: "readonly",
        AbortController: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        structuredClone: "readonly",
        // Node
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      // 未使用変数は実装の取り残しのサイン。ただし _ 始まりは意図的として許す。
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // 握りつぶした catch は原因の特定を不可能にする。空でも意図を書かせる。
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-console": "off",
    },
  },
  {
    // JSX 内で参照されている識別子を「使用済み」と認識させる。
    // これがないと <EmptyState /> のようなコンポーネント参照が
    // no-unused-vars に誤検知される。
    files: ["**/*.jsx"],
    plugins: { react },
    rules: {
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "off",
    },
  },
];
