import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
test("package is the dsh-whale-tide client plugin", () => {
  assert.equal(pkg.name, "dsh-whale-tide");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.main, "lib/index.js");
  assert.equal(pkg.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(pkg.dsh.client.platform, "web");
});
test("client loader id equals package name", () => {
  const client = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.match(client, /id: "dsh-whale-tide"/);
  assert.match(client, /exports\.name = "dsh-whale-tide"/);
});
test("patch inserts the plugin id", () => {
  const patch = readFileSync(new URL("../cordis.patch.yml", import.meta.url), "utf8");
  assert.match(patch, /id: dsh-whale-tide/);
  assert.match(patch, /name: dsh-whale-tide/);
});
test("locale resources exist", () => {
  for (const f of ["zh", "en"]) JSON.parse(readFileSync(new URL(`../locale/${f}.json`, import.meta.url), "utf8"));
});
