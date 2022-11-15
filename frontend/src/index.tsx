import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from "react-router-dom"

import Base from './routes/base';

const root = ReactDOM.createRoot(document.getElementById('app-root')!);

root.render(
    <BrowserRouter>
        <Base />
    </BrowserRouter>
)
