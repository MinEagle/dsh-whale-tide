# Release 0.5.0

Checklist for publishing Whale Tide.

## 1. Verify locally

```bash
cd dsh-whale-tide
npm test
node --check lib/client.js
```

Expected: 16 tests pass; the client parses; `package.json` has no
`prepare`/`build`/`install`/`postinstall`.

## 2. Pack the tarball

```bash
npm pack --pack-destination dist
tar -tzf dist/dsh-whale-tide-0.5.0.tgz | sort
```

The tarball must contain:

- `package/package.json`
- `package/lib/index.js`
- `package/lib/client.js`
- `package/lib/settings.js`
- `package/cordis.patch.yml`
- `package/locale/zh.json`
- `package/locale/en.json`
- `package/icon.svg`
- `package/README.md`, `package/README.en.md`
- `package/LICENSE`, `package/THIRD_PARTY_NOTICES.md`
- `package/vendor/ascii-sharks/*` (license + vendored source snapshot)

It must **not** contain `docs/media/*.png|gif`, `tools/`, or `test/`.
(`package.json.files` already white-lists the runtime set; `.npmignore` excludes
the rest.)

## 3. Publish to npm

```bash
npm login
npm publish --access public
```

`npm publish` requires registry auth. If the machine is offline, publish from a
machine with access and the same `package.json`/`files` list.

## 4. GitHub release

```bash
git tag v0.5.0
git push origin v0.5.0
gh release create v0.5.0 dist/dsh-whale-tide-0.5.0.tgz \
  --title "Whale Tide 0.5.0" \
  --notes-file docs/releases/0.5.0.md
```

The release body should link:

- the demo GIF (`docs/media/hero-tide.gif`);
- the install command;
- compatibility range;
- License and THIRD_PARTY_NOTICES.

## 5. Post-publish smoke test

```bash
dsh plugin --profile <profile> add dsh-whale-tide@0.5.0
```

Then:

1. Settings → Whale Tide shows the eight controls;
2. empty conversation shows the full tide;
3. active conversation ebbs to 16% and text stays readable;
4. removing the plugin restores the native background (no `body` attributes,
   no canvas).
