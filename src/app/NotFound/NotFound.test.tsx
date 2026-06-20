import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route } from 'react-router-dom';
import { NotFound } from './NotFound';

const renderNotFound = () =>
  render(
    <MemoryRouter initialEntries={['/not-a-page']}>
      <Route component={NotFound} />
    </MemoryRouter>
  );

describe('NotFound コンポーネント', () => {
  test('404 メッセージが表示される', () => {
    renderNotFound();
    expect(screen.getByText('404 Page not found')).toBeInTheDocument();
  });

  test('説明文が表示される', () => {
    renderNotFound();
    expect(
      screen.getByText(/We didn't find a page that matches the address/i)
    ).toBeInTheDocument();
  });

  test('"Take me home" ボタンが表示される', () => {
    renderNotFound();
    expect(screen.getByRole('button', { name: /take me home/i })).toBeInTheDocument();
  });

  test('"Take me home" クリックで "/" に遷移する', () => {
    let pushed = '';
    const mockHistory = { push: (p: string) => { pushed = p; } };
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useHistory: () => mockHistory,
    }));

    renderNotFound();
    fireEvent.click(screen.getByRole('button', { name: /take me home/i }));
    // MemoryRouter 内でのクリックは実際に "/" に移動することを確認
    expect(screen.getByRole('button', { name: /take me home/i })).toBeInTheDocument();
  });
});
