import solid from 'unplugin-solid/rolldown';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    {
      entry: ['src/index.tsx'],
      platform: 'neutral',
      dts: true,
      plugins: [solid()],
      // Backs the `./styles.css` subpath export.
      copy: [{ from: 'src/styles.css', to: 'dist' }],
    },
    {
      entry: ['src/index.tsx'],
      platform: 'neutral',
      dts: false,
      inputOptions: { transform: { jsx: 'preserve' } },
      outExtensions: () => ({ js: '.jsx' }),
    },
  ],
  staged: {
    '*.{ts,tsx,js,jsx}': 'vp check --fix',
    '*.{css,json,md,yml,yaml}': 'vp fmt',
  },
  fmt: {
    singleQuote: true,
    ignorePatterns: ['CHANGELOG.md'],
  },
  lint: {
    // `typeCheck` runs tsgolint, which is TS7-based and disagrees with the
    // TypeScript we build with. `pnpm typecheck` owns compiler diagnostics.
    options: { typeAware: true },
    rules: {
      // Solid assigns these through `ref={}`, which oxlint does not model.
      'no-unassigned-vars': 'off',
    },
  },
});
