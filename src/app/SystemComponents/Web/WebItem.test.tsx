import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WebItem } from './WebItem';

describe('WebItem コンポーネント', () => {
  test('"Web" タイトルが表示される', () => {
    render(<WebItem />);
    expect(screen.getByText('Web')).toBeInTheDocument();
  });

  test('サブタイトル説明文が表示される', () => {
    render(<WebItem />);
    expect(screen.getByText(/the web front end/i)).toBeInTheDocument();
  });

  test('GitHub リンクが表示される', () => {
    render(<WebItem />);
    expect(
      screen.getByText('https://github.com/quarkusdroneshop/quarkusdroneshop-web')
    ).toBeInTheDocument();
  });

  test('"Updated 2 days ago" テキストが表示される', () => {
    render(<WebItem />);
    expect(screen.getByText('Updated 2 days ago')).toBeInTheDocument();
  });

  test('"Detail" ボタンが表示される', () => {
    render(<WebItem />);
    expect(screen.getByRole('button', { name: /detail/i })).toBeInTheDocument();
  });

  test('"Detail" ボタンをクリックしてもクラッシュしない', () => {
    render(<WebItem />);
    const btn = screen.getByRole('button', { name: /detail/i });
    expect(() => fireEvent.click(btn)).not.toThrow();
  });

  test('DataListItem に id="Web" が設定されている', () => {
    render(<WebItem />);
    expect(document.getElementById('Web')).toBeInTheDocument();
  });
});
