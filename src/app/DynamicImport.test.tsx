import * as React from 'react';
import { render, act } from '@testing-library/react';
import { DynamicImport } from './DynamicImport';

// DynamicImport は componentWillUnmount で window.clearTimeout を呼ぶ
// jsdom では window.clearTimeout が定義されていない場合があるためスタブを用意する
beforeAll(() => {
  if (typeof window.clearTimeout !== 'function') {
    (window as any).clearTimeout = (id?: number) => clearTimeout(id);
  }
});

describe('DynamicImport コンポーネント', () => {
  test('ロード前は children に null を渡す', () => {
    const load = () => new Promise<never>(() => {});
    const children = jest.fn(() => <div />);
    render(<DynamicImport load={load} focusContentAfterMount={false}>{children}</DynamicImport>);
    expect(children).toHaveBeenCalledWith(null);
  });

  test('default export を持つモジュールをロードして children に渡す', async () => {
    const Comp = () => <div data-testid="loaded" />;
    const load = () => Promise.resolve({ default: Comp });
    const children = jest.fn((C: any) => (C ? <C /> : <span>loading</span>));

    await act(async () => {
      render(<DynamicImport load={load} focusContentAfterMount={false}>{children}</DynamicImport>);
    });

    expect(children).toHaveBeenLastCalledWith(Comp);
  });

  test('default なしモジュールをロードして children に渡す', async () => {
    const Comp = () => <div data-testid="no-default" />;
    const load = () => Promise.resolve(Comp);
    const children = jest.fn((C: any) => (C ? <C /> : <span>loading</span>));

    await act(async () => {
      render(<DynamicImport load={load} focusContentAfterMount={false}>{children}</DynamicImport>);
    });

    expect(children).toHaveBeenLastCalledWith(Comp);
  });

  test('focusContentAfterMount=true のとき accessibleRouteChangeHandler が呼ばれる', async () => {
    document.body.innerHTML = '<main id="primary-app-container" tabindex="-1"></main>';
    const container = document.getElementById('primary-app-container') as HTMLElement;
    const focusSpy = jest.spyOn(container, 'focus');

    const Comp = () => <div />;
    const load = () => Promise.resolve({ default: Comp });

    await act(async () => {
      render(
        <DynamicImport load={load} focusContentAfterMount={true}>
          {(C: any) => (C ? <C /> : null)}
        </DynamicImport>
      );
    });

    // accessibleRouteChangeHandler は 50ms のタイマーなので実際に待つ
    await new Promise(r => setTimeout(r, 60));
    expect(focusSpy).toHaveBeenCalled();
  });

  test('アンマウント時にタイマーがクリアされる', async () => {
    const clearSpy = jest.spyOn(window, 'clearTimeout');
    const load = () => Promise.resolve({ default: () => <div /> });

    let unmount: () => void;
    await act(async () => {
      const result = render(
        <DynamicImport load={load} focusContentAfterMount={false}>
          {(C: any) => (C ? <C /> : null)}
        </DynamicImport>
      );
      unmount = result.unmount;
    });

    act(() => { unmount(); });
    expect(clearSpy).toHaveBeenCalled();
  });

  test('ロードが null を返した場合は component を更新しない', async () => {
    const load = () => Promise.resolve(null);
    const children = jest.fn((C: any) => <div>{C ? 'loaded' : 'empty'}</div>);

    await act(async () => {
      render(<DynamicImport load={load} focusContentAfterMount={false}>{children}</DynamicImport>);
    });

    expect(children).toHaveBeenLastCalledWith(null);
  });
});
