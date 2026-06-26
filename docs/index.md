# Homeoffice UI

## 概要

Homeoffice UI はドローンショップの **ホームオフィス管理フロントエンド** です。

- 注文状況のリアルタイム監視ダッシュボード
- 在庫一覧・管理機能
- GraphQL 経由で Homeoffice Backend に接続

**フレームワーク**: React / Node.js  
**デプロイ先クラスター**: c-cluster

---

## アーキテクチャ

```
ブラウザ（管理者）
        │
        ▼ HTTP
┌─────────────────┐
│  Homeoffice UI  │──► GraphQL ──► Homeoffice Backend
│  (React SPA)    │
└─────────────────┘
```

### 依存サービス

- **quarkusdroneshop-homeoffice**: GraphQL API バックエンド
- **PostgreSQL**: バックエンド経由でデータ取得

---

## ローカル開発

### 前提条件

- Node.js 18+
- npm または yarn
- Homeoffice Backend が起動済みであること

### 1. Homeoffice Backend 起動

```shell
# 別ターミナルで
cd quarkusdroneshop-homeoffice
./mvnw clean compile quarkus:dev
```

### 2. UI 起動

```shell
git clone https://github.com/quarkusdroneshop/quarkusdroneshop-homeoffice-ui.git
cd quarkusdroneshop-homeoffice-ui
npm install
npm run start:dev
```

ブラウザで http://localhost:3000 にアクセス。

### 環境変数

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `REACT_APP_GRAPHQL_URL` | `http://localhost:8080/graphql` | GraphQL エンドポイント |

---

## 本番デプロイ（Tekton Pipeline）

### パイプライン概要

```
fetch-repository → semgrep-scan → npm-build → push-oc-apps
```

### 手動実行

```shell
tkn pipeline start build-and-push-quarkusdroneshop-homeoffice-ui \
  -n quarkusdroneshop-cicd \
  --use-param-defaults
```

### OpenShift への直接デプロイ（初回）

```shell
oc new-project quarkusdroneshop-homeoffice

# PostgreSQL
oc new-app -n quarkusdroneshop-homeoffice \
  --name postgres \
  --template="openshift/postgresql-persistent" \
  -e POSTGRESQL_USER=droneshopuser \
  -e POSTGRESQL_PASSWORD=redhat-20 \
  -e POSTGRESQL_DATABASE=droneshopdb

# Homeoffice Backend
oc new-app -n quarkusdroneshop-homeoffice \
  quay.io/quarkus/ubi-quarkus-native-s2i:20.3.0-java11~https://github.com/quarkusdroneshop/homeoffice-backend.git \
  --name homeoffice-backend \
  -e POSTGRESQL_JDBC_URL="jdbc:postgresql://postgres:5432/droneshopdb?currentSchema=droneshop" \
  -e POSTGRESQL_USER=droneshopuser \
  -e POSTGRESQL_PASSWORD=redhat-20
```

---

## テスト

```shell
# ユニットテスト
npm test

# ビルド確認
npm run build
```

---

## 注意事項

- **GraphQL エンドポイント設定**: 本番環境では `REACT_APP_GRAPHQL_URL` を Homeoffice Backend の OpenShift Route に設定してください。
- **ブラウザ互換性**: Chrome・Firefox 最新版を推奨。IE はサポートしていません。
- **Homeoffice Backend の起動順**: UI 起動前に必ず Backend が起動済みであることを確認してください。
