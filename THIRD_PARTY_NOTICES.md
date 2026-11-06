# Third-party notices

Whale Tide is MIT-licensed. Its glyph ocean engine is adapted from the
open-source projects below. All notices are retained here and, where the
project ships source, in `vendor/`.

No runtime image, audio or video assets are used: every visual is drawn with
canvas text and rectangles at runtime.

---

## ascii-sharks

- Project: https://github.com/stackedlol/ascii-sharks
- Pinned commit: `c521e24a787e6d4cc460d4cf2b9815f25e4fe453`
- Copyright (c) 2026 drewdi
- License: MIT
- Local source: `vendor/ascii-sharks/`

The pinned upstream tree does not contain a separate `LICENSE` file. The MIT
text retained in `vendor/ascii-sharks/LICENSE` is included here as the
project's stated license so the attribution travels with the vendored source.

What Whale Tide retains and adapts:

- the fixed-timestep accumulator (`STEP = 1/60`, `MAX_STEPS = 4`);
- Reynolds boids (separation, alignment, cohesion, blind spot, alarm
  contagion) accelerated with a spatial hash built from `Int32Array`
  head/next links;
- the follow-the-leader ridge creature with a per-joint `maxBend` and a
  travelling body wave;
- continuous-space sampling into `floor(x / cellW)` grid cells with separate
  flag and shade buffers, supersampled edges, and shade-selected glyph ramps;
- wake energy deposition, diffusion and decay;
- the idea of a fixed cell grid painted with glyphs rather than a bitmap.

The whale silhouette, the tide phases, the GlyphAtlas, the ink-measured ramp,
the client integration and the settings UI are original or adapted further as
described below.

### MIT License

```
MIT License

Copyright (c) 2026 drewdi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## dsh-quiet

- Project: https://github.com/AvenYQ/dsh-quiet
- Copyright (c) 2026 AvenYQ
- License: MIT
- Used for: DSH integration mechanisms only; its renderer is not copied.

What Whale Tide adapts:

- mounting a full-window `position: fixed; z-index: 0; pointer-events: none;
  overflow: hidden` backdrop and forcing the body base colour so the layer is
  visible;
- the reading glow (`.text` + a `::before` soft white/dark halo) used by the
  standalone preview, and its inherited text-shadow variant in the DSH page;
- the phase model: `hero` is the full tide, `active` ebbs it; returning to
  `hero` lets fish swim back in from the edges.

### MIT License

```
MIT License

Copyright (c) 2026 AvenYQ

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## dsh-ascii-whales

- Project: https://github.com/Chael-Chael/dsh-ascii-whales
- License: MIT (integration and adaptation)
- Used for: reference implementation of the DSH settings section wiring,
  the per-glyph-colour canvas atlas (`GlyphAtlas`), the ink-measured shading
  ramp (`InkRamp`), and a humpback whale outline/flipper/fluke geometry
  adapted from the same ascii-sharks lineage.
- The upstream project's own `THIRD_PARTY_NOTICES.md` attributes the
  animation to stackedlol/ascii-sharks and the kanji shading approach to
  michikusa404/ascii-kanji-sharks (MIT). Whale Tide does not use the bundled
  fonts or the kanji glyph set from that project; it measures an ASCII pool
  and draws with the system monospace stack.

### MIT License

```
MIT License

Copyright (c) 2026 Chael-Chael and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
