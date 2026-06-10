# Mobile brand assets — `_default` (SmashBook)

Build-time native identity assets for the SmashBook brand, referenced by
`app.config.ts`. Phase 0 of the white-label plan
(`docs/white-label/FE_WHITE_LABEL_MOBILE_ARCHITECTURE_PLAN.md`).

> These are **placeholder** assets (solid brand-blue field + a geometric "S"
> mark) so builds resolve end-to-end. Replace the PNGs with final art; the SVG
> masters in `_src/` are the spec.

## Files

| File                    | Size / format | Alpha                              | Used for                                                               |
| ----------------------- | ------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `icon.png`              | 1024×1024 PNG | **no** (App Store requires opaque) | iOS app icon                                                           |
| `adaptive-icon.png`     | 1024×1024 PNG | yes                                | Android adaptive icon foreground (over `adaptiveIcon.backgroundColor`) |
| `splash-icon.png`       | 1024×1024 PNG | yes                                | Native splash logo (over `splash.backgroundColor`)                     |
| `notification-icon.png` | 96×96 PNG     | yes (white-on-transparent)         | Android notification icon                                              |

Brand color: `#2563EB` (`cta` / `hero`, mirrors `src/theme/palette.ts` `blue600`).

## Regenerating placeholders

```bash
node assets/_src/generate-pngs.mjs   # from apps/mobile-player
```

These assets are now produced by the **registry-driven** brand asset pipeline
(plan §6 / Phase 6) in `@repo/branding`, not the legacy per-app generator. The
pipeline reads each brand's accent colour + output paths from its resolved
manifest and emits every size from one master geometry — no per-brand script:

```bash
# from packages/branding
REGEN=1 pnpm test -- asset-descriptors   # refresh registry → JSON projection
node scripts/generate-assets.mjs _default   # this brand's assets
node scripts/generate-assets.mjs            # all brands
```

The generator is dependency-free (Node `zlib` only). Dimensions + alpha are
validated in CI (`scripts/asset-dimensions.test.ts`), so a wrong-sized export
fails the build, not a customer's first launch. For final art, hand the master
logo (the `_src/*.svg` here are the SmashBook reference) to a designer and drop
the exported PNGs in at the sizes above.

> The original `_src/generate-pngs.mjs` is kept as the SmashBook master-art
> reference; the registry pipeline above is the source of truth for generating
> every brand's assets.

Full onboarding + intake spec: [`docs/white-label/FE_WHITE_LABEL_BRAND_KIT.md`](../../../docs/white-label/FE_WHITE_LABEL_BRAND_KIT.md).
