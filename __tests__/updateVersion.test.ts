import {isNewerVersion, parseVersionValue} from '../src/services/updateVersion';

describe('updateVersion', () => {
  it('parses semantic version strings with codex suffix', () => {
    expect(parseVersionValue('1.3.0-codex')).toBe(130);
    expect(parseVersionValue('v1.2.6')).toBe(126);
  });

  it('does not treat the same version as an update', () => {
    expect(isNewerVersion('1.3.0-codex', '1.3.0-codex')).toBe(false);
  });

  it('treats only a higher semantic version as an update', () => {
    expect(isNewerVersion('1.3.1-codex', '1.3.0-codex')).toBe(true);
    expect(isNewerVersion('1.2.9-codex', '1.3.0-codex')).toBe(false);
  });
});
