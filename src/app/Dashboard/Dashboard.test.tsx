import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ApolloProvider } from '@apollo/react-hooks';
import mockClient from 'src/__mocks__/apolloclient';

// 重いチャートコンポーネントはモック化
jest.mock('./ItemSalesChart', () => ({ ItemSalesChart: () => <div data-testid="item-sales-chart" /> }));
jest.mock('./ItemSalesTrendsChart', () => ({ ItemSalesTrendsChart: () => <div data-testid="item-sales-trends-chart" /> }));
jest.mock('./StoreSalesChart', () => ({ StoreSalesChart: () => <div data-testid="store-sales-chart" /> }));
jest.mock('./AverageOrderTimeChart', () => ({ AverageOrderTimeChart: () => <div data-testid="avg-order-time-chart" /> }));
jest.mock('./MockerSwitch', () => ({ MockerSwitch: () => <div data-testid="mocker-switch" /> }));

import { Dashboard } from './Dashboard';

const renderDashboard = () =>
  render(
    <ApolloProvider client={mockClient as any}>
      <Dashboard />
    </ApolloProvider>
  );

describe('Dashboard コンポーネント', () => {
  test('Dashboard 見出しが表示される', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('Key Metrics ラベルが表示される', () => {
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
});
