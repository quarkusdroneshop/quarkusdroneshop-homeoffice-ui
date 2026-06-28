import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ApolloProvider } from '@apollo/react-hooks';
import mockClient from 'src/__mocks__/apolloclient';

import { OrderBoard } from './OrderBoard';

const renderOrderBoard = () =>
  render(
    <ApolloProvider client={mockClient as any}>
      <OrderBoard />
    </ApolloProvider>
  );

describe('OrderBoard コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('GraphQL unavailable'));
  });

  test('ページタイトルが表示される', async () => {
    await act(async () => { renderOrderBoard(); });
    await waitFor(() => {
      expect(screen.getByText('リアルタイム注文ボード')).toBeInTheDocument();
    });
  });

  test('3 列（注文受付・処理中・OrderUp）が表示される', async () => {
    await act(async () => { renderOrderBoard(); });
    await waitFor(() => {
      expect(screen.getByText('注文受付')).toBeInTheDocument();
      expect(screen.getByText('処理中')).toBeInTheDocument();
      expect(screen.getByText('OrderUp')).toBeInTheDocument();
    });
  });

  test('GraphQL 未接続時にデモデータが表示される', async () => {
    await act(async () => { renderOrderBoard(); });
    await waitFor(() => {
      expect(screen.getByText('田中 太郎')).toBeInTheDocument();
    });
  });

  test('デモデータに処理中の注文が含まれる', async () => {
    await act(async () => { renderOrderBoard(); });
    await waitFor(() => {
      expect(screen.getByText('佐藤 一郎')).toBeInTheDocument();
    });
  });
});
