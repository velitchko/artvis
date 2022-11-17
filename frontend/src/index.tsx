import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom"
import { ApolloProvider } from '@apollo/client';
import client from './components/apollo/client';
import Base from './routes/base';

const root = ReactDOM.createRoot(document.getElementById('app-root')!);

root.render(
    <ApolloProvider client={client}>
        <BrowserRouter>
            <Base />
        </BrowserRouter>
    </ApolloProvider>
)
