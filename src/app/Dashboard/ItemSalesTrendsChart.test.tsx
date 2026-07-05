import * as React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import mockClient from 'src/__mocks__/apolloclient';

jest.mock('@patternfly/react-charts', () => ({
  Chart: ({ children, ariaTitle }: any) => (
    <div data-testid="chart" aria-label={ariaTitle}>{children}</div>
  ),
  ChartArea: ({ name }: any) => <div data-testid={`chart-area-${name}`} />,
  ChartAxis: () => <div data-testid="chart-axis" />,
  ChartStack: ({ children }: any) => <div data-testid="chart-stack">{children}</div>,
  ChartLegend: () => <div data-testid="chart-legend" />,
  ChartThemeColor: { multiOrdered: 'multi-ordered' },
  createContainer: () => () => <div />,
}));

import { ItemSalesTrendsChart } from './ItemSalesTrendsChart';

const makeSaleDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const mockProductSales = [
  {
    item: 'QDC_A101',
    productItemSales: [
      { item: 'QDC_A101', saleDate: makeSaleDate(1), salesTotal: 10 },
      { item: 'QDC_A101', saleDate: makeSaleDate(2), salesTotal: 15 },
    ],
  },
  {
    item: 'QDC_A102',
    productItemSales: [
      { item: 'QDC_A102', saleDate: makeSaleDate(1), salesTotal: 5 },
    ],
  },
];

describe('ItemSalesTrendsChart コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('カードタイトル "Item Sales Trends" が表示される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { productSalesByDate: [] },
    });
    await act(async () => { render(<ItemSalesTrendsChart />); });
    expect(screen.getByText('Item Sales Trends')).toBeInTheDocument();
  });

  test('データ取得後にチャートが描画される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { productSalesByDate: mockProductSales },
    });
    await act(async () => { render(<ItemSalesTrendsChart />); });
    await waitFor(() =>
      expect(screen.getByTestId('chart')).toBeInTheDocument()
    );
  });

  test('productItemSales が空のアイテムはチャートに描画されない', async () => {
    const dataWithEmpty = [
      { item: 'EMPTY_ITEM', productItemSales: [] },
      ...mockProductSales,
    ];
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { productSalesByDate: dataWithEmpty },
    });
    await act(async () => { render(<ItemSalesTrendsChart />); });
    await waitFor(() =>
      expect(screen.queryByTestId('chart-area-EMPTY_ITEM')).not.toBeInTheDocument()
    );
  });

  test('saleDate が文字列から Date に変換されてもクラッシュしない', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { productSalesByDate: mockProductSales },
    });
    await act(async () => { render(<ItemSalesTrendsChart />); });
    expect(screen.getByText('Item Sales Trends')).toBeInTheDocument();
  });

  test('GraphQL エラー時もクラッシュしない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('fetch error'));
    // ItemSalesTrendsChart はエラーを catch しないため unhandledRejection になる可能性がある
    // コンポーネント自体はクラッシュせず表示されることを確認する
    await act(async () => { render(<ItemSalesTrendsChart />); });
    expect(screen.getByText('Item Sales Trends')).toBeInTheDocument();
    (console.error as jest.Mock).mockRestore();
  });

  test('productSalesByDate が undefined のときも安全に処理する', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { productSalesByDate: undefined },
    });
    await act(async () => { render(<ItemSalesTrendsChart />); });
    expect(screen.getByText('Item Sales Trends')).toBeInTheDocument();
  });

  test('componentDidMount で query が呼ばれる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { productSalesByDate: [] },
    });
    await act(async () => { render(<ItemSalesTrendsChart />); });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });
});
