import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { GeneralSettings } from './GeneralSettings';

describe('GeneralSettings コンポーネント', () => {
  test('ページタイトルが表示される', () => {
    render(<GeneralSettings />);
    expect(screen.getByText('General Settings Page Title')).toBeInTheDocument();
  });

  test('h1 見出しとして描画される', () => {
    render(<GeneralSettings />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('General Settings Page Title');
  });
});
