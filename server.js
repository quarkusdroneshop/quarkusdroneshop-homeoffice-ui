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

// GitHub API proxy — adds Authorization header when GITHUB_TOKEN is set.
// Reduces 403 Rate Limit errors (unauthenticated: 60 req/h → authenticated: 5000 req/h).
// If GITHUB_TOKEN is not set, requests are forwarded without auth (same as direct browser calls).
const githubToken = process.env.GITHUB_TOKEN || '';
if (githubToken) {
  console.log('GitHub API proxy: authenticated (GITHUB_TOKEN set)');
} else {
  console.log('GitHub API proxy: unauthenticated (set GITHUB_TOKEN env var to increase rate limit)');
}

app.use('/api/github', (req, res) => {
  const targetPath = req.url; // e.g. /repos/org/repo or /repos/org/repo/stats/commit_activity
  const githubApiUrl = `https://api.github.com${targetPath}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'quarkusdroneshop-homeoffice-ui',
  };
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
  }

  const https = require('https');
  const url = new URL(githubApiUrl);
  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    res.set('Content-Type', 'application/json');
    // Pass rate-limit headers back so the browser can inspect them
    ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'].forEach(h => {
      if (proxyRes.headers[h]) res.set(h, proxyRes.headers[h]);
    });
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    console.error(`[github-proxy] ${githubApiUrl}: ${err.message}`);
    res.status(502).json({ error: 'GitHub API unavailable', detail: err.message });
  });
  proxyReq.end();
});

// Local health endpoint for homeoffice-ui (Node.js).
// Must be registered BEFORE the proxy so Express resolves it first.
// Returns the same JSON structure as Quarkus /q/health so that the
// homeoffice-backend serviceHealthChecks() query can detect "status":"UP".
app.get('/q/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    checks: [
      {
        name: 'node-server',
        status: 'UP',
        data: {
          uptime: Math.floor(process.uptime()),
          nodeVersion: process.version,
        },
      },
    ],
  });
});

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
