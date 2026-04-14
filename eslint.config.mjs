import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/ui/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.ui.json',
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.browser
      }
    }
  },
  {
    files: ['src/main/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.main.json',
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.es2021,
        pixso: 'readonly',
        __html__: 'readonly'
      }
    }
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    rules: {
      'no-console': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports'
        }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  eslintConfigPrettier
);
