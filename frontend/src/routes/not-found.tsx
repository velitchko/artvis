
import React from "react";
import ParticlesComponent from "../components/particles/particles";

export default function ErrorPage() {

    return (
        <React.StrictMode>
            <ParticlesComponent />
            <div className="w-full flex h-[75vh] justify-center items-center mx-auto">
                <div className="absolute">
                    <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl">Oops!</h1>
                    <h2 className="px-4 py-2 text-white bg-black rounded">Sorry, an unexpected error has occurred.</h2>
                </div>
            </div>
        </React.StrictMode>
    );
}   