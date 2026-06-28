import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsProvider } from '../../utils/SettingsContext';
import { GeneralSettings } from './GeneralSettings';

const renderPage = () =>
  render(
    <SettingsProvider>
      <GeneralSettings />
    </SettingsProvider>
  );

beforeEach(() => localStorage.clear());

describe('GeneralSettings コンポーネント', () => {
  test('ページタイトルが表示される', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '一般設定' })).toBeInTheDocument();
  });

  test('ポーリング間隔スライダーが表示される', () => {
    renderPage();
    expect(screen.getAllByText(/ポーリング間隔/).length).toBeGreaterThan(0);
  });

  test('在庫アラート閾値スライダーが表示される', () => {
    renderPage();
    expect(screen.getByText(/在庫枯渇アラート閾値/)).toBeInTheDocument();
  });

  test('保存ボタンが表示される', () => {
    renderPage();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  });

  test('デフォルトに戻すボタンが表示される', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'デフォルトに戻す' })).toBeInTheDocument();
  });
});
