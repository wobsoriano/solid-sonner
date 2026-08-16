import solid from 'unplugin-solid/rolldown';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    // Compiled output for the `default` condition.
    {
      entry: ['src/index.tsx'],
      platform: 'neutral',
      dts: true,
      plugins: [solid()],
      // Backs the `./styles.css` subpath export.
      copy: [{ from: 'src/styles.css', to: 'dist' }],
    },
    // JSX left untouched for the `solid` condition, so the consumer's Solid
    // compiler can target DOM, SSR or hydration.
    {
      entry: ['src/index.tsx'],
      platform: 'neutral',
      dts: false,
      inputOptions: { transform: { jsx: 'preserve' } },
      outExtensions: () => ({ js: '.jsx' }),
    },
  ],
  fmt: { singleQuote: true },
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
