# homeoffice-ui

React + TypeScript 製のホームオフィスダッシュボード。`homeoffice-backend` の GraphQL API からデータを取得し、売上チャート・注文ボード・在庫アラートなどを表示します。

## 画面構成

| ページ | パス | 説明 |
|---|---|---|
| Dashboard | `/` | 売上チャート群・在庫アラート・平均処理時間 |
| OrderBoard | `/orderboard` | 直近4時間のライブ注文 (Kanban: IN_QUEUE / IN_PROGRESS / FULFILLED) |
| Settings | `/settings` | GraphQL エンドポイント等の設定表示 |
| Support | `/support` | サポート情報 |

### Dashboard コンポーネント

- **StoreSalesChart** – 店舗別売上 (棒グラフ)
- **ItemSalesChart** – 商品別売上 (棒グラフ)
- **ItemSalesTrendsChart** – 商品別日別売上推移 (折れ線グラフ)
- **AverageOrderTimeChart** – 平均注文処理時間 (P50/P95/P99)
- **InventoryAlert** – 在庫切れアラート
- **MockerSwitch** – モック切替スイッチ

## Apollo Client 設定

`src/apolloclient.ts`

```typescript
const link = new HttpLink({
  uri: process.env.REACT_APP_GRAPHQL_ENDPOINT,
  credentials: 'omit',  // cross-origin HTTPS バックエンドに対して必須
});
```

`credentials: 'omit'` を使用することで、`Access-Control-Allow-Origin: *` のバックエンドと組み合わせて CORS エラーを回避しています。

## ローカル開発

```shell
npm install
npm run start:dev
```

`homeoffice-backend` と PostgreSQL が起動している必要があります。GraphQL エンドポイントは環境変数 `REACT_APP_GRAPHQL_ENDPOINT` で設定します。

```shell
export REACT_APP_GRAPHQL_ENDPOINT=http://localhost:8080/graphql
```

## エンドポイント設定スクリプト

`set-endpoint.sh` を使うと、実行中の OpenShift Route から自動的にエンドポイントを設定してビルドできます。

```shell
bash set-endpoint.sh
```

## OpenShift デプロイ

```shell
oc new-app \
  -n quarkusdroneshop-demo \
  --name=homeoffice-ui \
  nodejs:latest~https://github.com/quarkusdroneshop/quarkusdroneshop-homeoffice-ui.git \
  --build-env=REACT_APP_GRAPHQL_ENDPOINT=https://<homeoffice-backend-route>/graphql

oc expose svc/homeoffice-ui
```

> **注意**: `homeoffice-backend` の OpenShift Route には TLS edge termination が必要です。`http://` の UI から `https://` のバックエンドに接続する際、Route に TLS 設定がないと HTTP 503 になります。

## 環境変数

| 変数名 | 説明 |
|---|---|
| `REACT_APP_GRAPHQL_ENDPOINT` | homeoffice-backend の GraphQL エンドポイント URL |

## 参考

- [quarkusdroneshop.github.io](https://quarkusdroneshop.github.io)
