/**
 * 从插件源码里抽出海洋引擎，生成一个能在 file:// 下直接打开的预览页。
 * 用法：node tools/preview.mjs [client.js 路径]
 * 默认读本仓库的 lib/client.js；改的是安装目录里的副本时把路径传进来。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = process.argv[2] || join(here, "..", "lib", "client.js");
const src = readFileSync(srcPath, "utf8");

const start = src.indexOf("function createOcean(canvas,opts){");
if (start < 0) throw new Error("找不到 createOcean(canvas,opts){");
const ret = src.indexOf("return api;", start);
if (ret < 0) throw new Error("找不到 createOcean 的 return api;");
const end = src.indexOf("\n}", ret);
if (end < 0) throw new Error("找不到 createOcean 的结尾");
const code = src.slice(start, end + 2);

const out = `/* 由 tools/preview.mjs 生成，请改 lib/client.js 后重新生成 */
(function(root){
${code}
root.DSOcean={createOcean};
})(typeof window!=="undefined"?window:globalThis);
`;

mkdirSync(join(here, "preview"), { recursive: true });
writeFileSync(join(here, "preview", "ocean-bg.js"), out);
console.log(`ocean-bg.js ← ${srcPath} (${code.split("\n").length} 行)`);
