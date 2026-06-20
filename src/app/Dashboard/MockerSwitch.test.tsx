import * as React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// moduleNameMapper で src/apolloclient → src/__mocks__/apolloclient に解決済み
// jest.fn() を使うため直接インポートする
import mockClient from 'src/__mocks__/apolloclient';

// MockerSwitch が内部で import する 'src/apolloclient' はモックに差し替え済み
import { MockerSwitch } from './MockerSwitch';

describe('MockerSwitch コンポーネント', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('初期状態でローディング表示', () => {
    (mockClient.query as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<MockerSwitch />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('GraphQL 取得後にスイッチが表示される（OFF状態）', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { mockerPaused: false } });
    await act(async () => {
      render(<MockerSwitch />);
    });
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByText('Mocker OFF')).toBeInTheDocument();
  });

  test('GraphQL 取得後にスイッチが表示される（ON状態）', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { mockerPaused: true } });
    await act(async () => {
      render(<MockerSwitch />);
    });
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.getByText('Mocker ON')).toBeInTheDocument();
  });

  test('GraphQL エラー時は空表示になる', async () => {
    (mockClient.query as jest.Mock).mockRejectedValue(new Error('network error'));
    await act(async () => {
      render(<MockerSwitch />);
    });
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  test('スイッチをクリックすると mutation が呼ばれる', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { mockerPaused: false } });
    (mockClient.mutate as jest.Mock).mockResolvedValue({ data: { mockerTogglePause: true } });
    await act(async () => {
      render(<MockerSwitch />);
    });
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    const checkbox = screen.getByRole('checkbox');
    await act(async () => {
      await userEvent.click(checkbox);
    });
    await waitFor(() => expect(mockClient.mutate).toHaveBeenCalledTimes(1));
  });

  test('mutation エラー時は元の状態に戻る', async () => {
    (mockClient.query as jest.Mock).mockResolvedValue({ data: { mockerPaused: false } });
    (mockClient.mutate as jest.Mock).mockRejectedValue(new Error('mutation error'));
    await act(async () => {
      render(<MockerSwitch />);
    });
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    const checkbox = screen.getByRole('checkbox');
    await act(async () => {
      await userEvent.click(checkbox);
    });
    await waitFor(() => expect(mockClient.mutate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Mocker OFF')).toBeInTheDocument());
  });
});
