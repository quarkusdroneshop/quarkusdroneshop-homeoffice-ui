import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Support } from './Support';

describe('Support コンポーネント', () => {
  test('タイトルが表示される', () => {
    render(<Support />);
    expect(screen.getByText('Empty State (Stub Support Module)')).toBeInTheDocument();
  });

  test('本文説明が表示される', () => {
    render(<Support />);
    expect(screen.getByText(/This represents an the empty state pattern/i)).toBeInTheDocument();
  });

  test('"Primary Action" ボタンが表示される', () => {
    render(<Support />);
    expect(screen.getByRole('button', { name: /primary action/i })).toBeInTheDocument();
  });

  test('セカンダリアクションボタンが複数表示される', () => {
    render(<Support />);
    expect(screen.getByRole('button', { name: /multiple/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /action buttons/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^can$/i })).toBeInTheDocument();
  });
});
