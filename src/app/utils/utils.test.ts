import { accessibleRouteChangeHandler } from './utils';

describe('accessibleRouteChangeHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<main id="primary-app-container" tabindex="-1"></main>';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('タイマー ID（数値）を返す', () => {
    const timerId = accessibleRouteChangeHandler();
    expect(typeof timerId).toBe('number');
  });

  test('50ms 後にコンテナにフォーカスする', () => {
    const container = document.getElementById('primary-app-container') as HTMLElement;
    const focusSpy = jest.spyOn(container, 'focus');
    accessibleRouteChangeHandler();
    jest.advanceTimersByTime(50);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  test('コンテナが存在しない場合はエラーなく終了する', () => {
    document.body.innerHTML = '';
    expect(() => {
      accessibleRouteChangeHandler();
      jest.advanceTimersByTime(50);
    }).not.toThrow();
  });
});
