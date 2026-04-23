// ui/eslint.config.mjs
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      '.angular/**',
      'coverage/**',
      'node_modules/**',
      '*.mjs',
    ],
  },

  // ── TypeScript source files ──
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      eslintPluginPrettierRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Angular conventions
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],

      // TypeScript — Standard strictness level
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      'prefer-const': 'error',

      // Allow empty arrow functions (common for ControlValueAccessor hooks)
      '@typescript-eslint/no-empty-function': [
        'error',
        { allow: ['arrowFunctions', 'private-constructors'] },
      ],

      // Prettier integration
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },

  // ── Angular templates (*.html AND inline templates extracted via processor) ──
  // CHANGED: this block now handles all template rules — TS block doesn't reference
  // @angular-eslint/template/* rules because that plugin isn't loaded there
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // a11y rules as warnings — tech debt, not blocking CI
      '@angular-eslint/template/click-events-have-key-events': 'warn',
      '@angular-eslint/template/interactive-supports-focus': 'warn',
      '@angular-eslint/template/label-has-associated-control': 'warn',
    },
  },

  // Prettier must NOT format Angular templates
  {
    files: ['**/*.html'],
    rules: {
      'prettier/prettier': 'off',
    },
  },
);
