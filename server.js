const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 8080;

// バックエンドURL: 環境変数 GRAPHQL_BACKEND_URL で指定
// 例: http://quarkusdroneshop-homeoffice:8080  (OpenShift 内 Service 名)
//     http://localhost:9090                    (ローカル開発)
const backendUrl = process.env.GRAPHQL_BACKEND_URL || 'http://localhost:9090';

console.log(`GraphQL backend: ${backendUrl}`);

// /graphql と /q/ (health/metrics) をバックエンドに転送
// pathFilter を使うことで Express のパスプレフィックス除去を回避し、フルパスを保持して転送する
app.use(
  createProxyMiddleware({
    pathFilter: ['/graphql', '/q/'],
    target: backendUrl,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error(`[proxy] ${req.method} ${req.url} -> ${backendUrl} : ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Backend unavailable', detail: err.message });
        }
      },
    },
  })
);

// 静的ファイル (React ビルド成果物)
app.use(express.static(path.join(__dirname, '/dist')));

// SPA フォールバック
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '/dist/index.html'));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
