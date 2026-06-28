import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { ApolloProvider } from '@apollo/react-hooks';
import mockClient from 'src/__mocks__/apolloclient';

import { Support } from './Support';

const renderSupport = () =>
  render(
    <ApolloProvider client={mockClient as any}>
      <Support />
    </ApolloProvider>
  );

describe('Support コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('GraphQL unavailable'));
  });

  test('ページタイトルが表示される', async () => {
    await act(async () => { renderSupport(); });
    await waitFor(() => {
      expect(screen.getByText('Support')).toBeInTheDocument();
    });
  });

  test('DLQ セクションが表示される', async () => {
    await act(async () => { renderSupport(); });
    await waitFor(() => {
      expect(screen.getByText(/失敗注文 \(DLQ\)/)).toBeInTheDocument();
    });
  });

  test('GraphQL 未接続時にデモデータが表示される', async () => {
    await act(async () => { renderSupport(); });
    await waitFor(() => {
      expect(screen.getByText('ORD-E01')).toBeInTheDocument();
      expect(screen.getByText('在庫不足')).toBeInTheDocument();
    });
  });

  test('リトライボタンがレンダリングされる', async () => {
    await act(async () => { renderSupport(); });
    await waitFor(() => {
      const buttons = screen.getAllByText('リトライ');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  test('更新ボタンが表示される', async () => {
    await act(async () => { renderSupport(); });
    await waitFor(() => {
      expect(screen.getByText('更新')).toBeInTheDocument();
    });
  });
});
