---
'solid-sonner': patch
---

Migrate the toolchain to vite-plus (tsdown for the build, oxlint, oxfmt), replacing tsup, tsup-preset-solid and eslint.

The published package keeps the same shape, with one change: the `development` export condition (`dist/dev.js`, `dist/dev.jsx`) is gone. Resolution falls through to `default`, so this is not breaking. Styles are still inlined into the bundle and injected on import, and `solid-sonner/styles.css` is unchanged.

Note for contributors: oxlint has no equivalent to `eslint-plugin-solid`, so the Solid reactivity rules are no longer enforced.
