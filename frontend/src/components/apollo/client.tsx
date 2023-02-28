import {
    ApolloProvider,
    ApolloClient,
    createHttpLink,
    InMemoryCache,
    ApolloLink
} from '@apollo/client';

import { environment } from '../../../environments/environment';

const httpLink: ApolloLink = createHttpLink({
    uri: environment.graphQL
});

const cache = new InMemoryCache();

const client: ApolloClient<any> = new ApolloClient({
    link: httpLink,
    cache: cache
});

export default client;