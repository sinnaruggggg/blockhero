import {build} from 'esbuild';
import {cp, mkdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const toolDir = path.join(rootDir, 'tools', 'blockhero-creator');
const desktopDir = path.join(rootDir, 'tools', 'blockhero-creator-desktop');
const desktopAppDir = path.join(desktopDir, 'app');
const bundleOnly = process.argv.includes('--bundle-only');

async function ensureCleanDir(targetDir) {
  await rm(targetDir, {recursive: true, force: true});
  await mkdir(targetDir, {recursive: true});
}

async function bundleCreator() {
  await build({
    entryPoints: [path.join(toolDir, 'creator.js')],
    outfile: path.join(toolDir, 'creator.bundle.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome124'],
    loader: {
      '.json': 'json',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    logLevel: 'info',
  });
}

async function prepareDesktopApp() {
  await ensureCleanDir(desktopAppDir);
  await cp(path.join(toolDir, 'index.html'), path.join(desktopAppDir, 'index.html'));
  await cp(path.join(toolDir, 'styles.css'), path.join(desktopAppDir, 'styles.css'));
  await cp(
    path.join(toolDir, 'creator.bundle.js'),
    path.join(desktopAppDir, 'creator.bundle.js'),
  );
}

async function main() {
  await bundleCreator();
  await prepareDesktopApp();

  if (bundleOnly) {
    console.log('BlockHero Creator bundle prepared.');
    return;
  }

  console.log('BlockHero Creator desktop app prepared.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
