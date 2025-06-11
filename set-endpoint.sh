#!/bin/bash

ROUTE=$(oc get route homeoffice-backend -o jsonpath='{.spec.host}' -n quarkuscoffeeshop-demo)
echo "REACT_APP_GRAPHQL_ENDPOINT=http://$ROUTE/graphql" > .env
CORS=$(oc get ingresses.config.openshift.io cluster -o jsonpath='{.spec.domain}')
echo "ALLOWED_ORIGINS=http://homeoffice-ui-quarkuscoffeeshop-demo.$CORS" > .env