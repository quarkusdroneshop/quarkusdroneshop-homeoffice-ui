import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/react-hooks';
import mockClient from 'src/__mocks__/apolloclient';

// 重いコンポーネントをモック化
jest.mock('@app/Dashboard/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
jest.mock('@app/SystemComponents/SystemComponents', () => ({
  SystemComponents: () => <div data-testid="systemcomponents-page">System Components</div>,
}));
jest.mock('@app/OrderBoard/OrderBoard', () => ({
  OrderBoard: () => <div data-testid="orderboard-page">Order Board</div>,
}));
jest.mock('@app/Settings/General/GeneralSettings', () => ({
  GeneralSettings: () => <div data-testid="general-settings-page">General Settings</div>,
}));
jest.mock('@app/Settings/Profile/ProfileSettings', () => ({
  ProfileSettings: () => <div data-testid="profile-settings-page">Profile Settings</div>,
}));

// Support は動的 import — 同期モジュールに差し替え
jest.mock('@app/Support/Support', () => ({
  Support: () => <div data-testid="support-page">Support</div>,
}));

// routes をトップレベルでインポート（resetModules は使わない）
import { AppRoutes, routes } from '@app/routes';

const renderRoutes = (path: string) =>
  render(
    <ApolloProvider client={mockClient as any}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </ApolloProvider>
  );

describe('AppRoutes ルーティング', () => {
  test('"/" で Dashboard が表示される', () => {
    renderRoutes('/');
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });

  test('"/systemcomponents" で SystemComponents が表示される', () => {
    renderRoutes('/systemcomponents');
    expect(screen.getByTestId('systemcomponents-page')).toBeInTheDocument();
  });

  test('"/orderboard" で OrderBoard が表示される', () => {
    renderRoutes('/orderboard');
    expect(screen.getByTestId('orderboard-page')).toBeInTheDocument();
  });

  test('"/settings/general" で GeneralSettings が表示される', () => {
    renderRoutes('/settings/general');
    expect(screen.getByTestId('general-settings-page')).toBeInTheDocument();
  });

  test('"/settings/profile" で ProfileSettings が表示される', () => {
    renderRoutes('/settings/profile');
    expect(screen.getByTestId('profile-settings-page')).toBeInTheDocument();
  });

  test('"/support" で Support が表示される（非同期ロード）', async () => {
    await act(async () => { renderRoutes('/support'); });
    await waitFor(() =>
      expect(screen.getByTestId('support-page')).toBeInTheDocument()
    );
  });

  test('存在しないパスで NotFound が表示される', () => {
    renderRoutes('/this-page-does-not-exist');
    expect(screen.getByText('404 Page not found')).toBeInTheDocument();
  });
});

describe('routes 設定', () => {
  test('routes 配列がエクスポートされている', () => {
    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBeGreaterThan(0);
  });

  test('Dashboard ルートが "/" に設定されている', () => {
    const dashboard = routes.find((r: any) => r.path === '/');
    expect(dashboard).toBeDefined();
    expect((dashboard as any).label).toBe('Dashboard');
    expect((dashboard as any).exact).toBe(true);
  });

  test('OrderBoard ルートが "/orderboard" に設定されている', () => {
    const ob = routes.find((r: any) => r.path === '/orderboard');
    expect(ob).toBeDefined();
    expect((ob as any).label).toBe('Order Board');
  });

  test('Settings はルートグループとして定義されている', () => {
    const settings = routes.find((r: any) => r.label === 'Settings');
    expect(settings).toBeDefined();
    expect(Array.isArray((settings as any).routes)).toBe(true);
    expect((settings as any).routes.length).toBe(2);
  });

  test('全フラット化ルートのパスが一意である', () => {
    const flatPaths: string[] = routes.flatMap((r: any) =>
      r.routes ? r.routes.map((sr: any) => sr.path) : [r.path]
    );
    const unique = new Set(flatPaths);
    expect(unique.size).toBe(flatPaths.length);
  });

  test('title フィールドがすべてのルートに存在する', () => {
    const check = (r: any) => {
      if (r.routes) {
        r.routes.forEach(check);
      } else {
        expect(r.title).toBeTruthy();
      }
    };
    routes.forEach(check);
  });

  test('Support ルートが isAsync=true を持つ', () => {
    const support = routes.find((r: any) => r.path === '/support');
    expect(support).toBeDefined();
    expect((support as any).isAsync).toBe(true);
  });
});
