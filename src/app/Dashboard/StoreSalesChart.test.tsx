import * as React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import mockClient from 'src/__mocks__/apolloclient';

jest.mock('@patternfly/react-charts', () => ({
  Chart: ({ children, ariaTitle }: any) => (
    <div data-testid="store-chart" aria-label={ariaTitle}>{children}</div>
  ),
  ChartAxis: () => <div data-testid="chart-axis" />,
  ChartBar: ({ data }: any) => (
    <div data-testid="chart-bar" data-items={data?.length} />
  ),
  ChartStack: ({ children }: any) => <div>{children}</div>,
  ChartVoronoiContainer: () => <div />,
  ChartThemeColor: { multiOrdered: 'multi-ordered' },
}));

import { StoreSalesChart } from './StoreSalesChart';

const mockStoreSales = [
  {
    server: 'server-1',
    store: 'Tokyo',
    itemSales: [
      { item: 'COFFEE_BLACK', salesTotal: 30, revenue: 900 },
      { item: 'ESPRESSO', salesTotal: 10, revenue: 300 },
    ],
  },
  {
    server: 'server-2',
    store: 'Osaka',
    itemSales: [
      { item: 'COFFEE_BLACK', salesTotal: 20, revenue: 600 },
      { item: 'ESPRESSO', salesTotal: 15, revenue: 450 },
    ],
  },
];

describe('StoreSalesChart コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.log as jest.Mock).mockRestore();
    (console.error as jest.Mock).mockRestore();
  });

  test('カードタイトル "Store Sales" が表示される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { storeServerSalesByDate: [] },
    });
    await act(async () => { render(<StoreSalesChart />); });
    expect(screen.getByText('Store Sales')).toBeInTheDocument();
  });

  test('データ取得後にチャートが描画される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { storeServerSalesByDate: mockStoreSales },
    });
    await act(async () => { render(<StoreSalesChart />); });
    await waitFor(() =>
      expect(screen.getByTestId('store-chart')).toBeInTheDocument()
    );
  });

  test('ProcessGraphqlData: 2 商品 → ChartBar が 2 個生成される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { storeServerSalesByDate: mockStoreSales },
    });
    await act(async () => { render(<StoreSalesChart />); });
    await waitFor(() => {
      const bars = screen.getAllByTestId('chart-bar');
      expect(bars).toHaveLength(2);
    });
  });

  test('ProcessGraphqlData: 同一店舗の複数サーバーは合算される', async () => {
    const multiServerData = [
      {
        server: 'server-1',
        store: 'Tokyo',
        itemSales: [{ item: 'COFFEE_BLACK', salesTotal: 10, revenue: 300 }],
      },
      {
        server: 'server-2',
        store: 'Tokyo',
        itemSales: [{ item: 'COFFEE_BLACK', salesTotal: 20, revenue: 600 }],
      },
    ];
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { storeServerSalesByDate: multiServerData },
    });
    await act(async () => { render(<StoreSalesChart />); });
    // 同一店舗のデータが統合され ChartBar 1 個（商品1種）
    await waitFor(() =>
      expect(screen.getAllByTestId('chart-bar')).toHaveLength(1)
    );
  });

  test('データが空のときもクラッシュしない', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { storeServerSalesByDate: [] },
    });
    await act(async () => { render(<StoreSalesChart />); });
    expect(screen.getByText('Store Sales')).toBeInTheDocument();
  });

  test('GraphQL エラー時もクラッシュしない', async () => {
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('network error'));
    await act(async () => { render(<StoreSalesChart />); });
    expect(screen.getByText('Store Sales')).toBeInTheDocument();
  });

  test('componentDidMount で query が呼ばれる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { storeServerSalesByDate: [] },
    });
    await act(async () => { render(<StoreSalesChart />); });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });

  test('アンマウント時にインターバルがクリアされる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { storeServerSalesByDate: [] },
    });
    const clearSpy = jest.spyOn(window, 'clearInterval');
    let unmount: () => void;
    await act(async () => {
      const result = render(<StoreSalesChart />);
      unmount = result.unmount;
    });
    act(() => { unmount(); });
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
