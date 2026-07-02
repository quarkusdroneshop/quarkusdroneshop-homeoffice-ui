const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = process.env.PORT || 8080;

// デフォルトは OpenShift 内サービス名。env var がなくても動作する。
// ローカル開発時のみ GRAPHQL_BACKEND_URL=http://localhost:9090 で上書きする。
const backendUrl = process.env.GRAPHQL_BACKEND_URL || 'http://homeoffice-backend:8080';

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

// CPU usage sampling — compute every 5 seconds so /q/metrics can return a recent value
let lastCpuSample = process.cpuUsage();
let lastSampleTime = Date.now();
let currentCpuPct = 0;
setInterval(() => {
  const now = Date.now();
  const elapsed = (now - lastSampleTime) * 1000; // microseconds
  const usage = process.cpuUsage(lastCpuSample);
  const total = usage.user + usage.system;
  currentCpuPct = elapsed > 0 ? Math.min(total / elapsed, 1.0) : 0;
  lastCpuSample = process.cpuUsage();
  lastSampleTime = now;
}, 5000);

// /q/health and /q/metrics must be registered BEFORE the proxy middleware
// so Express matches them first (proxy pathFilter includes '/q/')
app.get('/q/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    checks: [
      {
        name: 'node-server liveness check',
        status: 'UP',
        data: { uptime: Math.floor(process.uptime()), nodeVersion: process.version },
      },
    ],
  });
});

app.get('/q/metrics', (_req, res) => {
  const mem = process.memoryUsage();
  const lines = [
    `process_uptime_seconds ${process.uptime().toFixed(3)}`,
    `system_cpu_usage ${currentCpuPct.toFixed(6)}`,
    `jvm_memory_used_bytes{area="heap",id="V8 Heap"} ${mem.heapUsed}`,
    `jvm_memory_max_bytes{area="heap",id="V8 Heap"} ${mem.heapTotal}`,
    `jvm_memory_used_bytes{area="nonheap",id="External"} ${mem.external + (mem.arrayBuffers || 0)}`,
    `jvm_threads_live_threads 1`,
  ];
  res.status(200).type('text/plain').send(lines.join('\n') + '\n');
});

// /graphql をバックエンドに転送 (/q/ はローカルエンドポイントで処理するため除外)
app.use(
  createProxyMiddleware({
    pathFilter: ['/graphql'],
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
