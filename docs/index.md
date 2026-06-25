# Docs
Please see the Github Pages Site for complete documentation: [quarkusdroneshop.github.io](https://quarkusdroneshop.github.io)


#Local Development
        npm install
        npm run start:dev

You will need the homeoffice-backend running, which also depends on a postgresql db


#Full Stack Deployment on OpenShift

        oc new-project quarkusdroneshop-homeoffice

        oc new-app \
        -n quarkusdroneshop-homeoffice \
        --name postgres \
        --template="openshift/postgresql-persistent" \
        -e POSTGRESQL_USER=droneshopuser \
        -e POSTGRESQL_PASSWORD=redhat-20 \
        -e POSTGRESQL_DATABASE=droneshopdb


        oc new-app \
        -n quarkusdroneshop-homeoffice \
        --name homeoffice-backend quay.io/quarkus/ubi-quarkus-native-s2i:20.3.0-java11~https://github.com/quarkusdroneshop/homeoffice-backend.git \
        -e POSTGRESQL_JDBC_URL="jdbc:postgresql://postgresql:5432/droneshopdb?currentSchema=droneshop" \
        -e POSTGRESQL_USER=droneshopuser \
        -e POSTGRESQL_PASSWORD=redhat-20

        oc expose svc/homeoffice-backend

        oc new-app \
        -n quarkusdroneshop-homeoffice \
        --name=homeoffice-ui nodejs:latest~https://github.com/quarkusdroneshop/quarkusdroneshop-homeoffice-ui.git \
        --build-env=REACT_APP_GRAPHQL_ENDPOINT=http://$(oc get routes -o json | jq -r '.items[0].spec.host' | grep homeoffice-backend)/graphql

        oc expose svc/homeoffice-ui

        oc annotate deployment -l app=homeoffice-ui app.openshift.io/connects-to='["homeoffice-backend"]'

        oc annotate deployment -l app=homeoffice-backend app.openshift.io/connects-to='["postgres"]'

        oc label dc -l app=postgres app.kubernetes.io/name=postgresql

        oc label deployment -l app=homeoffice-backend app.kubernetes.io/name=quarkus

        oc label deployment -l app=homeoffice-ui app.kubernetes.io/name=nodejs
