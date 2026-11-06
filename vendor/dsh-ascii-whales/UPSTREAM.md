# dsh-ascii-whales engine snapshot

- Upstream: https://github.com/Chael-Chael/dsh-ascii-whales
- Installed reference: 0.1.5 (`lib/client.js`, compiled browser bundle)
- License: MIT (see LICENSE and THIRD_PARTY_NOTICES.md in this directory)

Whale Tide vendors the full-window swimming / World / AsciiRenderer portion of
that bundle. It retains the upstream MIT notice and the ascii-sharks /
ascii-kanji-sharks notices. The source is not imported at runtime; the code is
inlined into `lib/client.js` for the DSH browser module loader.
