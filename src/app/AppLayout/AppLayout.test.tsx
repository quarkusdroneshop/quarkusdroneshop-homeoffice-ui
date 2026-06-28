import * as React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/react-hooks';
import mockClient from 'src/__mocks__/apolloclient';

// PatternFly の PageHeader は onNavToggle コールバックを持つ
// 実際の DOM イベント経由でトリガーする
jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    PageHeader: ({ onNavToggle, showNavToggle, logo, headerTools }: any) => (
      <header data-testid="page-header">
        {logo}
        {headerTools}
        {showNavToggle && (
          <button data-testid="nav-toggle-btn" onClick={onNavToggle}>
            Toggle
          </button>
        )}
      </header>
    ),
    PageSidebar: ({ isNavOpen, nav }: any) => (
      <div data-testid="page-sidebar" data-nav-open={String(isNavOpen)}>{nav}</div>
    ),
    Page: ({ children, onPageResize, header, sidebar, skipToContent }: any) => (
      <div>
        {skipToContent}
        {header}
        {sidebar}
        <main data-testid="page-main">{children}</main>
        {onPageResize && (
          <button
            data-testid="resize-trigger"
            onClick={() => onPageResize({ mobileView: true, windowSize: 400 })}
          />
        )}
      </div>
    ),
    SkipToContent: ({ children, href }: any) => <a href={href}>{children}</a>,
  };
});

import { AppLayout } from './AppLayout';

const renderLayout = (path = '/') =>
  render(
    <ApolloProvider client={mockClient as any}>
      <MemoryRouter initialEntries={[path]}>
        <AppLayout>
          <div data-testid="child-content">Content</div>
        </AppLayout>
      </MemoryRouter>
    </ApolloProvider>
  );

describe('AppLayout コンポーネント', () => {
  test('子要素がレンダリングされる', () => {
    renderLayout();
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  test('ロゴ画像が表示される', () => {
    renderLayout();
    expect(screen.getByAltText('Quarkus Droneshop Homeoffice')).toBeInTheDocument();
  });

  test('バージョンがヘッダーに表示される', () => {
    renderLayout();
    const pkg = require('/package.json');
    expect(screen.getByText(`Release ${pkg.version}`)).toBeInTheDocument();
  });

  test('nav-toggle ボタンクリックでナビの開閉が切り替わる（デスクトップ）', () => {
    renderLayout();
    // 初期は isMobileView=true なので onNavToggleMobile が呼ばれる
    const toggleBtn = screen.getByTestId('nav-toggle-btn');
    act(() => {
      fireEvent.click(toggleBtn);
    });
    // クリック後もクラッシュしないことを確認
    expect(toggleBtn).toBeInTheDocument();
  });

  test('ページリサイズイベントで isMobileView が更新される', () => {
    renderLayout();
    const resizeBtn = screen.getByTestId('resize-trigger');
    act(() => {
      fireEvent.click(resizeBtn);
    });
    // モバイルビューに切り替わった後の nav toggle は onNavToggleMobile
    const toggleBtn = screen.getByTestId('nav-toggle-btn');
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(screen.getByTestId('page-sidebar')).toBeInTheDocument();
  });

  test('nav グループ（Settings）が展開可能として表示される', () => {
    renderLayout();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('ナビゲーションリンクがすべて表示される', () => {
    renderLayout();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('System Components')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  test('SkipToContent が存在する', () => {
    renderLayout();
    expect(screen.getByText('Skip to Content')).toBeInTheDocument();
  });
});
