import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileSettings } from './ProfileSettings';

describe('ProfileSettings コンポーネント', () => {
  test('ページタイトルが表示される', () => {
    render(<ProfileSettings />);
    expect(screen.getByText('Profile Settings Page Title')).toBeInTheDocument();
  });

  test('h1 見出しとして描画される', () => {
    render(<ProfileSettings />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Profile Settings Page Title');
  });
});
