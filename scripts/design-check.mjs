/**
 * Preview 環境の画面を実測し、デザイン原則の数値基準への適合を検証する。
 *
 * 使い方:
 *   node scripts/design-check.mjs https://xxx.vercel.app [/path1 /path2 ...]
 *
 * 判定は実測値と閾値の比較だけで行う。主観的な判断を一切含まない。
 * これが design-qa を haiku で回せる理由であり、閾値を変えたい場合は
 * モデルに判断させるのではなく、人間がこのファイルの THRESHOLDS を変える。
 *
 * 必要: npx playwright install --with-deps chromium
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const THRESHOLDS = {
  contrastRatio: 4.5,   // WCAG 2.1 AA（本文）
  tapTargetPx: 44,      // WCAG 2.5.5 / iOS HIG
  axeImpact: ["critical", "serious"],
};

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
const OUT_DIR = "design-qa-artifacts";

const [baseUrl, ...pathArgs] = process.argv.slice(2);
if (!baseUrl) {
  console.error("usage: node scripts/design-check.mjs <base-url> [paths...]");
  process.exit(2);
}
const paths = pathArgs.length > 0 ? pathArgs : ["/"];

const failures = [];
const rows = [];

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

for (const path of paths) {
  const url = new URL(path, baseUrl).toString();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    let response;
    try {
      response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    } catch (e) {
      failures.push(`${path} @${vp.name}: ページを読み込めません (${e.message})`);
      await context.close();
      continue;
    }

    if (!response || !response.ok()) {
      failures.push(`${path} @${vp.name}: HTTP ${response ? response.status() : "no response"}`);
      await context.close();
      continue;
    }

    // 1. 横スクロールの発生
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    const hasOverflow = overflow.scrollWidth > overflow.innerWidth + 1;
    rows.push({
      check: "横スクロール",
      path,
      viewport: vp.name,
      actual: `${overflow.scrollWidth}px / ${overflow.innerWidth}px`,
      threshold: "なし",
      ok: !hasOverflow,
    });
    if (hasOverflow) {
      failures.push(
        `${path} @${vp.name}: 横スクロールが発生 (${overflow.scrollWidth}px > ${overflow.innerWidth}px)`,
      );
    }

    // 2. タップターゲットのサイズ（表示されている操作要素のみ）
    const smallTargets = await page.evaluate((min) => {
      const sel = 'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])';
      const out = [];
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;            // 非表示は対象外
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        if (r.width < min || r.height < min) {
          out.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40),
            size: `${Math.round(r.width)}x${Math.round(r.height)}`,
          });
        }
      }
      return out;
    }, THRESHOLDS.tapTargetPx);

    rows.push({
      check: "タップターゲット",
      path,
      viewport: vp.name,
      actual: smallTargets.length === 0 ? "違反なし" : `${smallTargets.length}件が閾値未満`,
      threshold: `${THRESHOLDS.tapTargetPx}x${THRESHOLDS.tapTargetPx}px`,
      ok: smallTargets.length === 0,
    });
    for (const t of smallTargets) {
      failures.push(`${path} @${vp.name}: タップターゲット ${t.size} <${t.tag}> "${t.text}"`);
    }

    // 3 & 4. コントラスト比と a11y 違反（axe-core）
    let axeOk = true;
    let axeSummary = "実行できず";
    try {
      await page.addScriptTag({ url: AXE_CDN });
      const result = await page.evaluate(async () => await window.axe.run(document, {
        resultTypes: ["violations"],
      }));

      const blocking = result.violations.filter((v) =>
        THRESHOLDS.axeImpact.includes(v.impact),
      );
      axeOk = blocking.length === 0;
      axeSummary = blocking.length === 0 ? "違反なし" : `${blocking.length}件`;

      for (const v of blocking) {
        failures.push(
          `${path} @${vp.name}: [axe/${v.impact}] ${v.id} — ${v.help} (${v.nodes.length}箇所)`,
        );
      }
    } catch (e) {
      // 確認できなかった項目は「問題なし」ではなく不合格として扱う
      axeOk = false;
      axeSummary = `実行できず: ${e.message}`;
      failures.push(`${path} @${vp.name}: axe-core を実行できませんでした (${e.message})`);
    }

    rows.push({
      check: "a11y (contrast含む)",
      path,
      viewport: vp.name,
      actual: axeSummary,
      threshold: `${THRESHOLDS.axeImpact.join("/")} 0件`,
      ok: axeOk,
    });

    // スクリーンショットを残す（人間が後から見るため。判定には使わない）
    const safe = path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
    await page.screenshot({
      path: `${OUT_DIR}/${safe}-${vp.name}.png`,
      fullPage: true,
    });

    await context.close();
  }
}

await browser.close();

// レポート出力
const md = [
  "## デザインQA実測結果",
  "",
  `対象: ${baseUrl}`,
  "",
  "| 項目 | パス | 幅 | 実測値 | 閾値 | 結果 |",
  "|---|---|---|---|---|---|",
  ...rows.map(
    (r) => `| ${r.check} | \`${r.path}\` | ${r.viewport} | ${r.actual} | ${r.threshold} | ${r.ok ? "OK" : "NG"} |`,
  ),
  "",
  failures.length === 0 ? "**判定: 合格**" : `**判定: 不合格（${failures.length}件）**`,
  "",
  ...(failures.length > 0 ? ["```", ...failures, "```"] : []),
].join("\n");

writeFileSync(`${OUT_DIR}/report.md`, md, "utf8");
console.log(md);

if (failures.length > 0) {
  console.error(`\n閾値を外れた項目が ${failures.length} 件あります。`);
  process.exit(1);
}
console.log("\nすべての実測項目が閾値内です。");
