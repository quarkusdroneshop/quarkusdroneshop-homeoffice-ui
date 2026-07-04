import * as React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import mockClient from 'src/__mocks__/apolloclient';

jest.mock('@patternfly/react-charts', () => ({
  ChartDonut: ({ title }: any) => <div data-testid="chart-donut">{title}</div>,
  ChartLegend: () => <div data-testid="chart-legend" />,
  ChartThemeColor: { multiOrdered: 'multi-ordered' },
}));

import { ItemSalesChart } from './ItemSalesChart';

const mockSalesData = [
  { item: 'QDC_A101', revenue: 1200, salesTotal: 40 },
  { item: 'QDC_A102', revenue: 800, salesTotal: 25 },
  { item: 'QDC_A103', revenue: 600, salesTotal: 20 },
];

describe('ItemSalesChart コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('カードタイトル "Item Sales Totals" が表示される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { itemSalesTotalsByDate: mockSalesData },
    });
    await act(async () => { render(<ItemSalesChart />); });
    expect(screen.getByText('Item Sales Totals')).toBeInTheDocument();
  });

  test('データ取得後に合計売上が ChartDonut の title に反映される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { itemSalesTotalsByDate: mockSalesData },
    });
    await act(async () => { render(<ItemSalesChart />); });
    await waitFor(() => {
      // totalSales = 40 + 25 + 20 = 85
      expect(screen.getByTestId('chart-donut')).toHaveTextContent('85');
    });
  });

  test('GraphQL エラー時もクラッシュしない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('network error'));
    await act(async () => { render(<ItemSalesChart />); });
    expect(screen.getByText('Item Sales Totals')).toBeInTheDocument();
    (console.error as jest.Mock).mockRestore();
  });

  test('data が空配列のとき totalSales=0 で描画する', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { itemSalesTotalsByDate: [] },
    });
    await act(async () => { render(<ItemSalesChart />); });
    await waitFor(() =>
      expect(screen.getByTestId('chart-donut')).toHaveTextContent('0')
    );
  });

  test('componentDidMount で query が呼ばれる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { itemSalesTotalsByDate: [] },
    });
    await act(async () => { render(<ItemSalesChart />); });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });

  test('アンマウント時にインターバルがクリアされる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { itemSalesTotalsByDate: [] },
    });
    const clearSpy = jest.spyOn(window, 'clearInterval');
    let unmount: () => void;
    await act(async () => {
      const result = render(<ItemSalesChart />);
      unmount = result.unmount;
    });
    act(() => { unmount(); });
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  test('salesTotal が undefined のアイテムは 0 として集計する', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({
      data: { itemSalesTotalsByDate: [{ item: 'X', revenue: 100 }] },
    });
    await act(async () => { render(<ItemSalesChart />); });
    await waitFor(() =>
      expect(screen.getByTestId('chart-donut')).toHaveTextContent('0')
    );
  });
});
