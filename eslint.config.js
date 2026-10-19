import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Aturan plugin ditulis eksplisit (bukan lewat preset 'configs.xxx') supaya lint
// tidak crash lagi bila versi plugin berubah: nama preset berbeda antar versi,
// sedangkan nama aturannya tetap.
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Komponen/ikon yang dipakai di JSX dihitung "terpakai". Tanpa ini,
      // no-unused-vars salah melapor <Icon /> sebagai variabel tak terpakai.
      'react/jsx-uses-vars': 'error',

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

      // Variabel, argumen, atau error yang sengaja tidak dipakai: awali dengan "_".
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // File context sengaja mengekspor Provider dan hook-nya dalam satu file.
    // Dampaknya hanya saat development: mengedit file ini memuat ulang halaman
    // penuh (bukan hot refresh). Build produksi tidak terpengaruh.
    files: ['src/context/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])