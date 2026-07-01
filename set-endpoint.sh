#!/bin/bash

# REACT_APP_GRAPHQL_ENDPOINT は相対パス固定。
# ブラウザは UI ホストの /graphql に送り、server.js が GRAPHQL_BACKEND_URL に転送する。
CORS=$(oc get ingresses.config.openshift.io cluster -o jsonpath='{.spec.domain}')
cat > .env <<EOF
REACT_APP_GRAPHQL_ENDPOINT=/graphql
ALLOWED_ORIGINS=https://homeoffice-ui-quarkusdroneshop-demo.${CORS}
EOF