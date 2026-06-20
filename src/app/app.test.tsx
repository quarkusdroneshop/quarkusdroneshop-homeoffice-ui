import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/react-hooks';
import mockClient from 'src/__mocks__/apolloclient';

const renderApp = (initialPath = '/') => {
  const { AppLayout } = require('@app/AppLayout/AppLayout');
  const { AppRoutes } = require('@app/routes');
  return render(
    <ApolloProvider client={mockClient as any}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </MemoryRouter>
    </ApolloProvider>
  );
};

describe('App — レイアウトとナビゲーション', () => {
  test('ロゴとタイトルが表示される', () => {
    renderApp();
    expect(screen.getByAltText('Quarkus Droneshop Homeoffice')).toBeInTheDocument();
    expect(screen.getByText('Quarkus Droneshop Homeoffice')).toBeInTheDocument();
  });

  test('ナビゲーションリンクが全て表示される', () => {
    renderApp();
    // PF4 の Nav は DOM には存在する（モバイルビューでは collapsed だが DOM 上には残る）
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('System Components')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('デフォルトで Dashboard ページが表示される', () => {
    renderApp('/');
    // ページ内の見出し（h1）として Dashboard が表示される
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  test('nav-toggle ボタンが存在する', () => {
    renderApp();
    expect(document.getElementById('nav-toggle')).toBeInTheDocument();
  });

  test('バージョン番号が表示される', () => {
    renderApp();
    const pkg = require('/package.json');
    expect(screen.getByText(`Release ${pkg.version}`)).toBeInTheDocument();
  });
});
