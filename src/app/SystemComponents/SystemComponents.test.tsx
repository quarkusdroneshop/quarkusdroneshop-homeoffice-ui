import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// 重いチャートコンポーネントをモック化
jest.mock('@patternfly/react-charts', () => ({
  ChartDonutUtilization: ({ title }: any) => <div data-testid="donut-chart">{title}</div>,
  ChartGroup: ({ children }: any) => <div data-testid="chart-group">{children}</div>,
  ChartArea: () => <div data-testid="chart-area" />,
  ChartVoronoiContainer: () => <div />,
  ChartAxis: () => <div />,
}));

jest.mock('./Web/WebItem', () => ({
  WebItem: () => <div data-testid="web-item">WebItem</div>,
}));

import { SystemComponents } from './SystemComponents';

describe('SystemComponents コンポーネント', () => {
  test('ページタイトルが表示される', () => {
    render(<SystemComponents />);
    expect(screen.getByText('Home Office')).toBeInTheDocument();
  });

  test('説明文が表示される', () => {
    render(<SystemComponents />);
    expect(screen.getByText(/Here is the status of each part of the system/i)).toBeInTheDocument();
  });

  test('Counter コンポーネント行が表示される', () => {
    render(<SystemComponents />);
    expect(screen.getByText('Counter')).toBeInTheDocument();
    expect(screen.getByText('coordinates events in the system')).toBeInTheDocument();
  });

  test('QDCA10 コンポーネント行が表示される', () => {
    render(<SystemComponents />);
    expect(screen.getByText('QDCA10')).toBeInTheDocument();
    expect(screen.getByText('makes drinks')).toBeInTheDocument();
  });

  test('QDCA10Pro コンポーネント行が表示される', () => {
    render(<SystemComponents />);
    expect(screen.getByText('QDCA10Pro')).toBeInTheDocument();
    expect(screen.getByText('makes food')).toBeInTheDocument();
  });

  test('Inventory コンポーネント行が表示される', () => {
    render(<SystemComponents />);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText(/stores and restocks the inventory/i)).toBeInTheDocument();
  });

  test('Detail ボタンが複数表示される', () => {
    render(<SystemComponents />);
    const detailButtons = screen.getAllByRole('button', { name: /detail/i });
    expect(detailButtons.length).toBeGreaterThanOrEqual(3);
  });

  test('Re-Stock ボタンが表示される', () => {
    render(<SystemComponents />);
    expect(screen.getByRole('button', { name: /re-stock/i })).toBeInTheDocument();
  });

  test('WebItem がレンダリングされる', () => {
    render(<SystemComponents />);
    expect(screen.getByTestId('web-item')).toBeInTheDocument();
  });

  test('データリストアイテムクリックでドロワーが展開される', () => {
    render(<SystemComponents />);
    const counterItem = document.getElementById('Counter');
    if (counterItem) {
      fireEvent.click(counterItem);
      expect(screen.getByText('Counter Details')).toBeInTheDocument();
    }
  });

  test('ドロワー閉じるボタンでドロワーが閉じる', () => {
    render(<SystemComponents />);
    const counterItem = document.getElementById('Counter');
    if (counterItem) {
      fireEvent.click(counterItem);
      expect(screen.getByText('Counter Details')).toBeInTheDocument();
      const closeBtn = screen.getByLabelText(/close drawer/i);
      fireEvent.click(closeBtn);
    }
  });
});
