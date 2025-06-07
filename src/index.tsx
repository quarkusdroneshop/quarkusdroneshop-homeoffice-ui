import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@app/index';

const container = document.getElementById('root') as HTMLElement;
const root = ReactDOM.createRoot(container);

if (process.env.NODE_ENV !== 'production') {
  const config = {
    rules: [
      {
        id: 'color-contrast',
        enabled: false,
      },
    ],
  };

  // `react-axe` は React 18 の `createRoot` には未対応のため、console に warning が出る可能性があります。
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axe = require('react-axe');
  axe(React, ReactDOM, 1000, config);
}

// React 18 では root.render を使う
root.render(<App />);