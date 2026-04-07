import React from 'react';
import {Alert, Text} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';
import AdminScreen from '../src/screens/AdminScreen';

jest.mock('../src/components/BackImageButton', () => 'BackImageButton');

jest.mock('../src/services/adminSync', () => ({
  getAdminStatus: jest.fn(),
}));

jest.mock('../src/services/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({data: []}),
    })),
  },
}));

const mockedAdminSync = require('../src/services/adminSync');
const mockedSupabase = require('../src/services/supabase');

const flushMicrotasks = () =>
  new Promise<void>(resolve => {
    setImmediate(() => resolve());
  });

function createNavigation() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
}

function flattenText(children: any): string[] {
  if (typeof children === 'string') {
    return [children];
  }
  if (Array.isArray(children)) {
    return children.flatMap(child => flattenText(child));
  }
  return [];
}

function expectText(tree: TestRenderer.ReactTestRenderer, expected: string) {
  const texts = tree.root
    .findAllByType(Text)
    .flatMap(node => flattenText(node.props.children));
  expect(texts.some(text => text.includes(expected))).toBe(true);
}

describe('AdminScreen', () => {
  let alertSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockedAdminSync.getAdminStatus.mockResolvedValue(true);
    mockedSupabase.supabase.rpc.mockResolvedValue({
      data: [{total_users: 12, today_signups: 3, active_rooms: 1, queue_size: 2}],
      error: null,
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('renders dashboard stats when bootstrap succeeds', async () => {
    const navigation = createNavigation();
    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(<AdminScreen navigation={navigation} />);
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expect(mockedAdminSync.getAdminStatus).toHaveBeenCalledTimes(1);
    expect(mockedSupabase.supabase.rpc).toHaveBeenCalledWith('get_admin_stats');
    expect(() => expectText(tree!, '관리자 화면을 열 수 없습니다.')).toThrow();

    act(() => {
      tree!.unmount();
    });
  });

  test('shows a fallback instead of crashing when admin status lookup throws', async () => {
    mockedAdminSync.getAdminStatus.mockRejectedValueOnce(
      new Error('admin bootstrap failed'),
    );

    const navigation = createNavigation();
    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(<AdminScreen navigation={navigation} />);
      await flushMicrotasks();
      await flushMicrotasks();
    });

    expectText(tree!, '관리자 화면을 열 수 없습니다.');
    expectText(tree!, '관리자 화면 초기화 중 오류가 발생했습니다.');

    act(() => {
      tree!.unmount();
    });
  });
});
