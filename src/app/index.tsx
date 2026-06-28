import * as React from 'react';
import '@patternfly/react-core/dist/styles/base.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { AppLayout } from '@app/AppLayout/AppLayout';
import { AppRoutes } from '@app/routes';
import '@app/app.css';

import { ApolloProvider } from '@apollo/react-hooks'
import client from 'src/apolloclient'
import { SettingsProvider } from './utils/SettingsContext'

const App: React.FunctionComponent = () => (
  <Router>
    <ApolloProvider client={client} >
      <SettingsProvider>
        <AppLayout>
          <AppRoutes />
        </AppLayout>
      </SettingsProvider>
    </ApolloProvider>
  </Router>
);

export { App };
