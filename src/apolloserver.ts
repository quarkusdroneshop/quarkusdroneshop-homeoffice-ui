const express = require('express');
const cors = require('cors');
const { ApolloServer, gql } = require('apollo-server-express');

const app = express();

const allowedOrigins = [process.env.ALLOWED_ORIGINS];

const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS Origin:', origin);
    if (!origin) {
      callback(null, true);
    } else if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn('Blocked by CORS:', origin);
      callback(null, false);
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const server = new ApolloServer();
require('dotenv').config();
const endpoint = process.env.REACT_APP_GRAPHQL_ENDPOINT;

(async () => {
  await server.start();
  server.applyMiddleware({ app, cors: false });
  app.listen(8080, () => {
    console.log(`Server ready at ${endpoint}`);
  });
})();