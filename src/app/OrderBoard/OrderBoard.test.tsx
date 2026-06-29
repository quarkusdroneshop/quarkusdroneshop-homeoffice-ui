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
      expect(screen.getByText('Real-Time Order Board')).toBeInTheDocument();
    });
  });

  test('3 列（In Queue・In Progress・Order Up）が表示される', async () => {
    await act(async () => { renderOrderBoard(); });
    await waitFor(() => {
      expect(screen.getByText('In Queue')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Order Up')).toBeInTheDocument();
    });
  });

  test('GraphQL 未接続時にエラーが表示される', async () => {
    await act(async () => { renderOrderBoard(); });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
