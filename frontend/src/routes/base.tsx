import React from "react";
import { Route, Routes, Link } from "react-router-dom"
import NetworkPage from "../pages/network";
import HomePage from "../pages/home";
import ArtistPage from "../pages/artist";
import ErrorPage from "./not-found";


export default function Base() {
    return (
        <React.StrictMode>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/network" element={<NetworkPage />} />
                <Route path="/artists" element={<ArtistPage />} />
                <Route path="*" element={<ErrorPage />} />
            </Routes>
        </React.StrictMode>
    );
}