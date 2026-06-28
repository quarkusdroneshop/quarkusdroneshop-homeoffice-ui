import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../utils/SettingsContext';
import { ProfileSettings } from './ProfileSettings';

const renderPage = () =>
  render(
    <SettingsProvider>
      <ProfileSettings />
    </SettingsProvider>
  );

beforeEach(() => localStorage.clear());

describe('ProfileSettings コンポーネント', () => {
  test('ページタイトルが表示される', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'プロフィール設定' })).toBeInTheDocument();
  });

  test('サイト選択フォームが表示される', () => {
    renderPage();
    expect(screen.getByText('アクティブサイト')).toBeInTheDocument();
  });

  test('保存ボタンが表示される', () => {
    renderPage();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });

  test('デフォルト選択が "すべてのサイト" である', () => {
    renderPage();
    expect(screen.getByText('すべてのサイト')).toBeInTheDocument();
  });
});
