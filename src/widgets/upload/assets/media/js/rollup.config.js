/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

// rollup.config.js
import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'esm', // ES Modules
        sourcemap: true, // Generate source maps
        name: 'CustomFileInput', // Optional, only needed for UMD/IIFE, can be removed for ESM
    },
    plugins: [
        typescript({
            tsconfig: './tsconfig.json',
        }),
    ],
};
