import fs from 'node:fs';
import path from 'node:path';

function readFile(relativePath: string) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

describe('app version sync', () => {
  it('keeps android build.gradle and appVersion constants aligned', () => {
    const buildGradle = readFile('android/app/build.gradle');
    const appVersion = readFile('src/constants/appVersion.ts');

    const versionCode = buildGradle.match(/versionCode\s+(\d+)/)?.[1];
    const versionName = buildGradle.match(/versionName\s+"([^"]+)"/)?.[1];
    const currentVersionCode = appVersion.match(
      /CURRENT_VERSION_CODE\s*=\s*(\d+)/,
    )?.[1];
    const currentVersionName = appVersion.match(
      /CURRENT_VERSION_NAME\s*=\s*'([^']+)'/,
    )?.[1];

    expect(versionCode).toBeTruthy();
    expect(versionName).toBeTruthy();
    expect(currentVersionCode).toBeTruthy();
    expect(currentVersionName).toBeTruthy();

    expect(currentVersionCode).toBe(versionCode);
    expect(currentVersionName).toBe(versionName);
  });
});
