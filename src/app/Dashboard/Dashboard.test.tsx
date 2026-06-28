import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApolloProvider } from '@apollo/react-hooks';
import mockClient from 'src/__mocks__/apolloclient';
import { SettingsProvider } from '../utils/SettingsContext';

jest.mock('./ItemSalesChart', () => ({ ItemSalesChart: () => <div data-testid="item-sales-chart" /> }));
jest.mock('./ItemSalesTrendsChart', () => ({ ItemSalesTrendsChart: () => <div data-testid="item-sales-trends-chart" /> }));
jest.mock('./StoreSalesChart', () => ({ StoreSalesChart: () => <div data-testid="store-sales-chart" /> }));
jest.mock('./AverageOrderTimeChart', () => ({ AverageOrderTimeChart: () => <div data-testid="avg-order-time-chart" /> }));
jest.mock('./MockerSwitch', () => ({ MockerSwitch: () => <div data-testid="mocker-switch" /> }));
jest.mock('./InventoryAlert', () => ({ InventoryAlert: () => <div data-testid="inventory-alert" /> }));

import { Dashboard } from './Dashboard';

beforeEach(() => localStorage.clear());

const renderDashboard = () =>
  render(
    <ApolloProvider client={mockClient as any}>
      <SettingsProvider>
        <Dashboard />
      </SettingsProvider>
    </ApolloProvider>
  );

describe('Dashboard コンポーネント', () => {
  test('Dashboard 見出しが表示される', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('表示切替ラベルが表示される', () => {
    renderDashboard();
    expect(screen.getByText('OrderUp')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  test('チャートコンポーネントがレンダリングされる', () => {
    renderDashboard();
    expect(screen.getByTestId('item-sales-chart')).toBeInTheDocument();
    expect(screen.getByTestId('item-sales-trends-chart')).toBeInTheDocument();
    expect(screen.getByTestId('store-sales-chart')).toBeInTheDocument();
    expect(screen.getByTestId('avg-order-time-chart')).toBeInTheDocument();
  });

  test('MockerSwitch がレンダリングされる', () => {
    renderDashboard();
    expect(screen.getByTestId('mocker-switch')).toBeInTheDocument();
  });

  test('OrderUp ラベルクリックで OrderUp セクションが非表示になる', () => {
    renderDashboard();
    expect(screen.getByTestId('store-sales-chart')).toBeInTheDocument();
    fireEvent.click(screen.getByText('OrderUp'));
    expect(screen.queryByTestId('store-sales-chart')).not.toBeInTheDocument();
  });

  test('Sales ラベルクリックで Sales チャートが非表示になる', () => {
    renderDashboard();
    expect(screen.getByTestId('item-sales-chart')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sales'));
    expect(screen.queryByTestId('item-sales-chart')).not.toBeInTheDocument();
  });

  test('在庫アラートコンポーネントが表示される（Inventory ON 時）', () => {
    renderDashboard();
    expect(screen.getByTestId('inventory-alert')).toBeInTheDocument();
  });
});
