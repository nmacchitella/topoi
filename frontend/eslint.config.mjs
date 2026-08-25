import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // The custom Material Symbols font is loaded once by the root App layout.
      '@next/next/no-page-custom-font': 'off',
      // API interceptors cannot access Next's component-scoped router.
      '@next/next/no-location-assign-relative-destination': 'off',
      // These React Compiler rules are opt-in checks; Topoi does not enable the compiler.
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'public/sw.js',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
  ]),
]);
