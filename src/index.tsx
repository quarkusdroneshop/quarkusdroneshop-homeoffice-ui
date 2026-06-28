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

  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000, config);
  });
}

// React 18 では root.render を使う
root.render(<App />);