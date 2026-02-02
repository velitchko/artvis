import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import { Artist } from '../models/artist.model';
import GET_ARTISTS from '../queries/artists';
import ArtistsComponent from '../components/artists/artist';
import SmallHeadingComponent from '../components/heading/small.heading';
import NavigationComponent from '../components/navigation/navigation';

const ExhibitionExplorerPage = () => {

    const [artists, setArtists] = useState(new Array<Artist>());
    const [loading, setLoading] = useState(true);
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    useEffect(() => {
        client.query({
            query: GET_ARTISTS
        })
            .then(result => {
                setArtists(result.data.artists as Array<Artist>);
                setLoading(false);
            });
    }, []);

    // Show/hide scroll to top button based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowScrollToTop(scrollTop > 300);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function - scroll to first artist in canvas
    const scrollToTop = () => {
        // The canvas grid has its own scroll container, we need to find it
        const canvasScrollContainer = document.querySelector('.overflow-auto.no-scrollbar') as HTMLDivElement;

        if (canvasScrollContainer) {
            // Scroll the canvas container to the top
            canvasScrollContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            // Fallback to window scroll if container not found
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    };

    return (
        <>
            <React.StrictMode>
                {/* The header is now integrated into ArtistsComponent */}
                {!loading && <ArtistsComponent artists={artists} exhibitionExplorer={true} />}
            </React.StrictMode>

            {/* Floating Scroll to Top Button - Outside StrictMode */}
            <button
                onClick={scrollToTop}
                className="fixed bottom-4 right-4 z-[9999] w-12 h-12 bg-black text-white border-2 border-white hover:bg-gray-800 hover:border-gray-300 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-105 rounded-full"
                title="Scroll to first artist"
                aria-label="Scroll to first artist"
                style={{
                    position: 'fixed',
                    bottom: '16px',
                    right: '16px',
                    zIndex: 99999,
                    backgroundColor: 'black',
                    border: '2px solid white',
                    pointerEvents: 'auto'
                }}
            >
                <svg
                    className="w-6 h-6 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                </svg>
            </button>
        </>
    );

}

export default ExhibitionExplorerPage;