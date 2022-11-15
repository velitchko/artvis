import React from 'react';
import { Link } from "react-router-dom";
import _ from 'lodash';

import {
    ApolloProvider,
    ApolloClient,
    createHttpLink,
    InMemoryCache,
    gql,
    ApolloLink
} from '@apollo/client';

import { environment } from '../../../environments/environment.dev';
import { colors } from '../../colors/colors';

class NetworkComponent extends React.Component<{}, {}> {
}

export default NetworkComponent;