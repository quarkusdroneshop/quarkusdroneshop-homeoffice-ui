import { ApolloClient, DefaultOptions, InMemoryCache, HttpLink } from '@apollo/client';

const graphqlEndpoint = process.env.REACT_APP_GRAPHQL_ENDPOINT;
console.log("GraphQL Endpoint: " + graphqlEndpoint);

const link = new HttpLink({
  uri: graphqlEndpoint,
  credentials: 'include',
});

const cache = new InMemoryCache();

const defaultOptions: DefaultOptions = {
  watchQuery: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'ignore',
  },
  query: {
    fetchPolicy: 'no-cache',
    errorPolicy: 'all',
  },
};

const client = new ApolloClient({
  link,
  cache,
  defaultOptions,
});

export default client;