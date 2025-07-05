#!/bin/bash

ROUTE=$(oc get route homeoffice-backend -o jsonpath='{.spec.host}' -n quarkusdroneshop-demo)
echo "REACT_APP_GRAPHQL_ENDPOINT=http://$ROUTE/graphql" > .env
CORS=$(oc get ingresses.config.openshift.io cluster -o jsonpath='{.spec.domain}')
echo "ALLOWED_ORIGINS=http://homeoffice-ui-quarkusdroneshop-demo.$CORS" >> .env