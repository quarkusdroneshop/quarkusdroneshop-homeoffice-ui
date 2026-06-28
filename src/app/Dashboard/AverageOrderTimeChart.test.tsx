import * as React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import mockClient from 'src/__mocks__/apolloclient';

jest.mock('@patternfly/react-charts', () => ({
  ChartBullet: ({ ariaTitle }: any) => <div data-testid="chart-bullet">{ariaTitle}</div>,
}));

import { AverageOrderTimeChart } from './AverageOrderTimeChart';

// setInterval / clearInterval をグローバルスコープで確実に利用できるようにする
beforeAll(() => {
  if (typeof (global as any).clearInterval === 'undefined') {
    (global as any).clearInterval = (id?: number) => clearInterval(id);
  }
});

describe('AverageOrderTimeChart コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('カードタイトルが表示される（初期値 0）', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { averageOrderUpTime: 0 } });
    await act(async () => { render(<AverageOrderTimeChart />); });
    expect(screen.getByText(/Average OrderUp Time/)).toBeInTheDocument();
  });

  test('GraphQL からデータを取得してタイトルに反映する', async () => {
    // 90分 → days=1, hours=30
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { averageOrderUpTime: 90 } });
    await act(async () => { render(<AverageOrderTimeChart />); });
    await waitFor(() =>
      expect(screen.getByText(/Average OrderUp Time: 1 days 30 hours/)).toBeInTheDocument()
    );
  });

  test('averageOrderUpTime が 0 のとき ChartBullet を描画する', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { averageOrderUpTime: 0 } });
    await act(async () => { render(<AverageOrderTimeChart />); });
    expect(screen.getByTestId('chart-bullet')).toBeInTheDocument();
  });

  test('GraphQL エラー時もクラッシュしない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('network error'));
    await act(async () => { render(<AverageOrderTimeChart />); });
    expect(screen.getByText(/Average OrderUp Time/)).toBeInTheDocument();
    (console.error as jest.Mock).mockRestore();
  });

  test('data が null の場合もクラッシュしない', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { averageOrderUpTime: null } });
    await act(async () => { render(<AverageOrderTimeChart />); });
    expect(screen.getByText(/Average OrderUp Time/)).toBeInTheDocument();
  });

  test('DataList のベンチマーク行が表示される', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { averageOrderUpTime: 60 } });
    await act(async () => { render(<AverageOrderTimeChart />); });
    await waitFor(() =>
      expect(screen.getByText(/Objective is under/)).toBeInTheDocument()
    );
  });

  test('componentDidMount で query が呼ばれる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { averageOrderUpTime: 0 } });
    await act(async () => { render(<AverageOrderTimeChart />); });
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });

  test('アンマウント時にインターバルがクリアされる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { averageOrderUpTime: 0 } });
    const clearSpy = jest.spyOn(window, 'clearInterval');
    let unmount: () => void;
    await act(async () => {
      const result = render(<AverageOrderTimeChart />);
      unmount = result.unmount;
    });
    act(() => { unmount(); });
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
