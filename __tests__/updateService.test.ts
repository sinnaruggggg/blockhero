jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {
      DownloadDir: '/downloads',
    },
  },
  config: jest.fn(),
  android: {
    actionViewIntent: jest.fn(),
  },
}));

import {
  formatUpdateDialogMessage,
  formatUpdateSize,
} from '../src/services/updateService';

describe('updateService formatting', () => {
  test('formats apk size in megabytes', () => {
    expect(formatUpdateSize(157286400)).toBe('150MB');
    expect(formatUpdateSize(52428800)).toBe('50.0MB');
    expect(formatUpdateSize(0)).toBe('알 수 없음');
  });

  test('builds an update dialog message with version, size, and notes only', () => {
    expect(
      formatUpdateDialogMessage({
        versionName: '1.3.29',
        sizeBytes: 104857600,
        releaseNotes: '- 관리자 화면 안정화',
      }),
    ).toBe(
      ['버전: 1.3.29', '용량: 100MB', '', '내용:', '- 관리자 화면 안정화'].join(
        '\n',
      ),
    );
  });
});
