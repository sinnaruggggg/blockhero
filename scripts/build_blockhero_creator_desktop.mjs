import {access, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'tools', 'blockhero-creator-desktop');
const desktopAppDir = path.join(desktopDir, 'app');
const bundleOnly = process.argv.includes('--bundle-only');

async function prepareDesktopApp() {
  await mkdir(desktopAppDir, {recursive: true});
  await Promise.all(
    ['index.html', 'styles.css', 'creator.bundle.js'].map(async fileName => {
      await access(path.join(desktopAppDir, fileName));
    }),
  );
}

async function main() {
  await prepareDesktopApp();

  if (bundleOnly) {
    console.log('BlockHero Creator desktop app sources verified.');
    return;
  }

  console.log('BlockHero Creator desktop app prepared from tools/blockhero-creator-desktop/app.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
