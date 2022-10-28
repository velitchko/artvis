import './index.scss'

import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './components/app/app';
import {
    ApolloProvider,
    ApolloClient,
    createHttpLink,
    InMemoryCache,
    gql
} from '@apollo/client';

const httpLink = createHttpLink({
    uri: 'http://localhost:4000'
});

const client = new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache()
});

const container = document.getElementById('app-root')!

const root = createRoot(container)

client.query({
    query: gql`query { artists { firstname, lastname } }`
}).then((result) => console.log(result));

root.render(
    <ApolloProvider client={client}>
    <App />
    </ApolloProvider>
)
