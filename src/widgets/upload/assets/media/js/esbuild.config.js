/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'esm',
    outfile: 'dist/index.js',
    sourcemap: true,
    target: 'es2020',
    platform: 'browser',
    tsconfig: './tsconfig.json',
    logLevel: 'info',
    minify: !isWatch,
};

const build = async () => {
    try {
        if (isWatch) {
            const ctx = await esbuild.context(buildOptions);
            await ctx.watch();
            console.log('Watching for changes...');
        } else {
            await esbuild.build(buildOptions);
            console.log('Build completed: dist/index.js');
        }
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
};

build();
