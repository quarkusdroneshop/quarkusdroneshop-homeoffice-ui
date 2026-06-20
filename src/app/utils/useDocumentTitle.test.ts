import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle フック', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  test('タイトルを設定する', () => {
    renderHook(() => useDocumentTitle('テストページ'));
    expect(document.title).toBe('テストページ');
  });

  test('アンマウント時に元のタイトルに戻す', () => {
    document.title = '元のタイトル';
    const { unmount } = renderHook(() => useDocumentTitle('新しいタイトル'));
    expect(document.title).toBe('新しいタイトル');
    unmount();
    expect(document.title).toBe('元のタイトル');
  });

  test('タイトルが変化したら再設定する', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'ページ A' },
    });
    expect(document.title).toBe('ページ A');
    rerender({ title: 'ページ B' });
    expect(document.title).toBe('ページ B');
  });
});
