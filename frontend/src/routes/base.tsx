import React from "react";
import { Route, Routes, Link } from "react-router-dom"
import NetworkPage from "../pages/network";
import HomePage from "../pages/home";
import ArtistPage from "../pages/artist";
import ErrorPage from "./not-found";
import ExhibitionExplorerPage from "../pages/exhibition.explorer";
import ArtistDetailPage from "../pages/artist.detail";
import ExhibitionsPage from "../pages/exhibitions";
import AboutPage from "../pages/about";
import PublicationsPage from "../pages/publications";
import GroupsPage from "../pages/groups";
import GroupDetailPage from "../pages/group.detail";
import DataPage from "../pages/data";
import ContactPage from "../pages/contact";
import ToolsPage from "../pages/tools";


export default function Base() {
    return (
        <React.StrictMode>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/publications" element={<PublicationsPage />} />
                <Route path="/artists" element={<ArtistPage />} />
                <Route path="/artist/:id" element={<ArtistDetailPage />} />
                <Route path="/artist/" element={<ArtistDetailPage />} />
                <Route path="/exhibitions" element={<ExhibitionExplorerPage />} />
                <Route path="/exhibition/:artist" element={<ExhibitionsPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/group/:id" element={<GroupDetailPage />} />
                <Route path="/data" element={<DataPage />} />
                <Route path="/tools" element={<ToolsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="*" element={<ErrorPage />} />
            </Routes>
        </React.StrictMode>
    );
}