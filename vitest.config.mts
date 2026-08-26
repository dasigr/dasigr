import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The `@/*` alias comes from tsconfig.json — one source of truth. This is a Vite
  // resolve option, not a `test` one; nesting it under `test` fails silently and
  // every aliased import resolves as a bare package name.
  resolve: { tsconfigPaths: true },
  test: {
    // Nothing under test needs a DOM. Components are covered by browser checks
    // and E2E later, not here.
    environment: 'node',
    // Scope is enforced by the runner, not by convention: a component test cannot
    // silently join the suite. Widening this glob is a deliberate decision.
    include: ['src/{actions,lib}/**/*.test.ts'],
    globals: false,
  },
});
