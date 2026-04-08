import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'tools', 'blockhero-creator');
const outPath = path.join(outDir, 'default-creator-manifest.json');

mkdirSync(outDir, {recursive: true});
const {buildDefaultCreatorManifest} = await import('../src/game/creatorManifest.ts');

writeFileSync(outPath, `${JSON.stringify(buildDefaultCreatorManifest(), null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
