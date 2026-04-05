export function parseVersionValue(version: string): number {
  const match = version.replace(/^v/, '').match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    return 0;
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = match[3] ? parseInt(match[3], 10) : 0;
  return major * 100 + minor * 10 + patch;
}

export function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  return parseVersionValue(latestVersion) > parseVersionValue(currentVersion);
}
