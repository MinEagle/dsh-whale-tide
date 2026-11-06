import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const patch = readFileSync(join(root, "cordis.patch.yml"), "utf8");
const client = readFileSync(join(root, "lib/client.js"), "utf8");
const zh = JSON.parse(readFileSync(join(root, "locale/zh.json"), "utf8"));
const en = JSON.parse(readFileSync(join(root, "locale/en.json"), "utf8"));

test("manifest is an installable DSH client bundle", () => {
  assert.equal(pkg.name, "dsh-whale-tide");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.main, "lib/index.js");
  assert.equal(pkg.exports["./client"], "./lib/client.js");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh.client.platform, "web");
  assert.deepEqual(pkg.dsh.client.inject, [
    "@deepseek-ai/dsh-client-ui-settings",
    "@deepseek-ai/dsh-client-ui-conversation",
    "@deepseek-ai/dsh-client-locale",
  ]);
});

test("compatibility is declared through engines.dsh, not dsh peers", () => {
  assert.equal(pkg.engines.dsh, ">=0.2.0-rc.2 <0.3.0-0");
  assert.equal(pkg.peerDependencies, undefined);
});

test("no install-time build hook can be blocked by pnpm 10", () => {
  const scripts = pkg.scripts || {};
  for (const name of ["prepare", "preinstall", "install", "postinstall", "build"]) {
    assert.equal(scripts[name], undefined, name);
  }
});

test("patch row id and client registration id match the package name", () => {
  assert.match(patch, /id:\s*dsh-whale-tide/);
  assert.match(patch, /name:\s*dsh-whale-tide/);
  assert.match(client, /id:\s*"dsh-whale-tide"/);
  assert.equal((client.match(/__ModuleLoader__\.load\(/g) || []).length, 1);
});

test("locale resources carry plugin-manager metadata", () => {
  assert.equal(typeof zh.meta.title, "string");
  assert.equal(typeof zh.meta.description, "string");
  assert.equal(typeof en.meta.title, "string");
  assert.equal(typeof en.meta.description, "string");
  for (const [file, dict] of [["zh", zh], ["en", en]]) {
    for (const key of ["enabled", "density", "speed", "opacity", "conversationOpacity", "conversationDensity", "color", "followTheme", "reset"]) {
      assert.equal(typeof dict[key], "string", `${file}.${key}`);
    }
  }
});

test("the npm file list includes every runtime export", () => {
  assert.ok(pkg.files.includes("lib"));
  assert.ok(pkg.files.includes("cordis.patch.yml"));
  assert.ok(pkg.files.includes("locale/*.json"));
  assert.ok(pkg.files.includes("icon.svg"));
  assert.ok(pkg.files.includes("LICENSE"));
  assert.ok(pkg.files.includes("THIRD_PARTY_NOTICES.md"));
});
