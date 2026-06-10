# Mobile brand assets — `_default` (SmashBook)

Build-time native identity assets for the SmashBook brand, referenced by
`app.config.ts`. Phase 0 of the white-label plan
(`docs/FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md`).

> These are **placeholder** assets (solid brand-blue field + a geometric "S"
> mark) so builds resolve end-to-end. Replace the PNGs with final art; the SVG
> masters in `_src/` are the spec.

## Files

| File | Size / format | Alpha | Used for |
| --- | --- | --- | --- |
| `icon.png` | 1024×1024 PNG | **no** (App Store requires opaque) | iOS app icon |
| `adaptive-icon.png` | 1024×1024 PNG | yes | Android adaptive icon foreground (over `adaptiveIcon.backgroundColor`) |
| `splash-icon.png` | 1024×1024 PNG | yes | Native splash logo (over `splash.backgroundColor`) |
| `notification-icon.png` | 96×96 PNG | yes (white-on-transparent) | Android notification icon |

Brand color: `#2563EB` (`cta` / `hero`, mirrors `src/theme/palette.ts` `blue600`).

## Regenerating placeholders

```bash
node assets/_src/generate-pngs.mjs   # from apps/mobile-player
```

The generator is dependency-free (Node `zlib` only). `_src/*.svg` are the master
art the placeholders approximate — hand these (or a real brand kit) to a designer
for final assets, then drop the exported PNGs in at the sizes above.

When the per-brand asset pipeline lands (plan §6 / Phase 6), each brand under
`packages/branding/src/brands/<id>/assets/` carries this same set, generated from a
single master logo + color spec and dimension-validated in CI.
