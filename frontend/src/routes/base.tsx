import React from "react";
import { Route, Routes, Link } from "react-router-dom"
import NetworkPage from "../pages/network";
import HomePage from "../pages/home";
import ArtistPage from "../pages/artist";
import ErrorPage from "./not-found";
import ExplorerPage from "../pages/explorer";
import ArtistDetailPage from "../pages/artist.detail";
import ArtistDetailTestPage from "../pages/artist.detail.test";
import ExhibitionsPage from "../pages/exhibitions";
import AboutPage from "../pages/about";


export default function Base() {
    return (
        <React.StrictMode>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/network" element={<NetworkPage />} />
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/artists" element={<ArtistPage />} />
                <Route path="/artist/:id" element={<ArtistDetailPage />} />
                <Route path="/artist/" element={<ArtistDetailPage />} />
                <Route path="/artists-test/:id" element={<ArtistDetailTestPage />} />
                <Route path="/exhibitions/:artist" element={<ExhibitionsPage />} />
                <Route path="*" element={<ErrorPage />} />
            </Routes>
        </React.StrictMode>
    );
}