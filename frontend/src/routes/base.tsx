import React from "react";
import { Route, Routes, Link } from "react-router-dom"
import NetworkComponent from "../components/network/network";
import SnapshotComponent from "../components/snapshots/snapshots";
import HomeComponent from "../pages/home";
import TempComponent from "../pages/temp";
import ErrorPage from "./not-found";


export default function Base() {
    return (
        <React.StrictMode>
            <Routes>
                <Route path="/" element={<HomeComponent />} />
                <Route path="/tmp" element={<TempComponent />} />
                <Route path="/network" element={<NetworkComponent />} />
                <Route path="/snapshots" element={<SnapshotComponent />} />
                <Route path="*" element={<ErrorPage />} />
            </Routes>
        </React.StrictMode>
    );
}