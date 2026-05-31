/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import globals from 'globals';
import eslint from '@eslint/js';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    {
        languageOptions: {
            globals: globals.browser,
            ecmaVersion: 'latest', // default - "latest"
        }
    },
    eslint.configs.recommended,
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        'rules': { // @see https://stackoverflow.com/a/64067915/24489536
            // note you must disable the base rule as it can report incorrect errors
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn', // or "error"
                // {
                //     'argsIgnorePattern': '^_',
                //     'varsIgnorePattern': '^_',
                //     'caughtErrorsIgnorePattern': '^_'
                // }
            ]
        }
    }
];
