import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Bundle TypeScript using the same transpiler as Vite, then use Node's test runner.
const result = await build({ entryPoints: ['tests/game-regressions.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const directory = mkdtempSync(join(tmpdir(), 'arcade-tests-'));
const filename = join(directory, 'game-regressions.mjs');
writeFileSync(filename, result.outputFiles[0].text);
process.on('exit', () => { unlinkSync(filename); rmdirSync(directory); });
await import(pathToFileURL(filename).href);
