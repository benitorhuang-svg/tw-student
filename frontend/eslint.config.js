import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const DOMAIN_DEEP_IMPORTS = [
  '@/domains/*/*',
  './domains/*/*',
  '../domains/*/*',
  '../../domains/*/*',
  '../../../domains/*/*',
  '../../../../domains/*/*',
  '../../../../../domains/*/*',
]

const APP_IMPORTS = [
  '@/app/*',
  '../app/*',
  '../../app/*',
  '../../../app/*',
  '../../../../app/*',
]

const DOMAIN_IMPORTS = [
  '@/domains/*',
  '@/domains/*/*',
  '../domains/*',
  '../../domains/*',
  '../../../domains/*',
  '../../../../domains/*',
]

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage', '.vite-cache']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: DOMAIN_DEEP_IMPORTS,
              message: 'Import domains through their public API, for example @/domains/atlas.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/domains/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...APP_IMPORTS, ...DOMAIN_IMPORTS],
              message: 'Domain modules must not depend on app or other domains. Move shared behavior to shared/* or expose it through the owning domain API.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...APP_IMPORTS, ...DOMAIN_IMPORTS],
              message: 'Shared kernel must not depend on app or domains.',
            },
          ],
        },
      ],
    },
  },
])
