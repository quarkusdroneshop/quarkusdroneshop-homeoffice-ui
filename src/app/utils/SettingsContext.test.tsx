import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsProvider, useSettings } from './SettingsContext';

const STORAGE_KEY = 'qdh_settings';

beforeEach(() => {
  localStorage.clear();
});

const Consumer: React.FC = () => {
  const { settings, updateSettings, toggleSection } = useSettings();
  return (
    <div>
      <span data-testid="polling">{settings.pollingIntervalMs}</span>
      <span data-testid="threshold">{settings.inventoryAlertThreshold}</span>
      <span data-testid="orderup">{String(settings.visibleSections.orderUp)}</span>
      <button onClick={() => updateSettings({ pollingIntervalMs: 5000 })}>set5s</button>
      <button onClick={() => toggleSection('orderUp')}>toggleOrderUp</button>
    </div>
  );
};

const renderConsumer = () =>
  render(
    <SettingsProvider>
      <Consumer />
    </SettingsProvider>
  );

describe('SettingsContext', () => {
  test('デフォルト値が返される', () => {
    renderConsumer();
    expect(screen.getByTestId('polling').textContent).toBe('3000');
    expect(screen.getByTestId('threshold').textContent).toBe('20');
    expect(screen.getByTestId('orderup').textContent).toBe('true');
  });

  test('updateSettings でポーリング間隔が更新される', () => {
    renderConsumer();
    fireEvent.click(screen.getByText('set5s'));
    expect(screen.getByTestId('polling').textContent).toBe('5000');
  });

  test('toggleSection で visibleSections が反転する', () => {
    renderConsumer();
    expect(screen.getByTestId('orderup').textContent).toBe('true');
    fireEvent.click(screen.getByText('toggleOrderUp'));
    expect(screen.getByTestId('orderup').textContent).toBe('false');
    fireEvent.click(screen.getByText('toggleOrderUp'));
    expect(screen.getByTestId('orderup').textContent).toBe('true');
  });

  test('設定が localStorage に永続化される', () => {
    renderConsumer();
    fireEvent.click(screen.getByText('set5s'));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.pollingIntervalMs).toBe(5000);
  });

  test('localStorage から設定を復元する', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pollingIntervalMs: 8000, inventoryAlertThreshold: 30 }));
    renderConsumer();
    expect(screen.getByTestId('polling').textContent).toBe('8000');
    expect(screen.getByTestId('threshold').textContent).toBe('30');
  });
});
