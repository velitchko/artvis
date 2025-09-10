import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeadingComponent from '../components/heading/heading';
import ParticlesComponent from '../components/particles/particles';
import SearchComponent from '../components/search/search';
import GET_EVERYTHING from '../queries/everything';
import client from '../components/apollo/client';

const HomePage = (props: any) => {
    const navigate = useNavigate();
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    const title = {
        maintitle: 'Art Vis',
        subtitle: 'Art History Visualized'
    };

    const handleClick = (id: string) => {
        console.log('navigating to ' + id);
        // go to the artist detail page 

        navigate('/artist/' + id);
    }

    const handleFeelingArtsy = async () => {
        try {
            // Get a random artist from your GraphQL endpoint
            const result = await client.query({
                query: GET_EVERYTHING,
                variables: { value: '' } // Empty search to get some results
            });
            
            if (result.data.artists && result.data.artists.length > 0) {
                const randomIndex = Math.floor(Math.random() * result.data.artists.length);
                const randomArtist = result.data.artists[randomIndex];
                navigate('/artist/' + randomArtist.id);
            } else {
                // Fallback to a predefined list of artist IDs or navigate to artists page
                navigate('/artists');
            }
        } catch (error) {
            console.error('Error getting random artist:', error);
            // Fallback navigation
            navigate('/artists');
        }
    };

    // Show/hide scroll to top button based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            // Show button after scrolling 200px on mobile, 300px on desktop
            const threshold = window.innerWidth < 640 ? 200 : 300;
            setShowScrollToTop(scrollTop > threshold);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };


    return (
        <React.StrictMode>
            <ParticlesComponent />
            
            {/* Google-inspired centered layout with footer in view */}
            <div className="w-full h-screen flex flex-col px-6 py-8 relative z-10">
                
                {/* Spacer for top */}
                <div className="flex-1"></div>
                
                {/* Logo section - perfectly centered */}
                <div className="text-center mb-8 sm:mb-12">
                    <HeadingComponent {...title} />
                </div>
                
                {/* Search section - Google-style positioning */}
                <div className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mx-auto">
                    <SearchComponent query={GET_EVERYTHING} onClick={handleClick} />
                    
                    {/* I'm Feeling Artsy Button */}
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={handleFeelingArtsy}
                            className="px-6 py-3 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        >
                            I'm Feeling Artsy
                        </button>
                    </div>
                </div>
                
                {/* Spacer for bottom */}
                <div className="flex-1"></div>
                
                {/* Minimal Footer - now in main view */}
                <footer className="w-full py-4 border-t border-gray-200">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-6 text-xs sm:text-sm text-gray-600">
                            <a href="/about" className="hover:text-gray-900 transition-colors">About</a>
                            <a href="/network" className="hover:text-gray-900 transition-colors">Network</a>
                            <a href="/artists" className="hover:text-gray-900 transition-colors">Browse Artists</a>
                            <a href="/exhibitions" className="hover:text-gray-900 transition-colors">Exhibitions</a>
                            <span className="hidden sm:inline text-gray-400">|</span>
                            <a href="/publications" className="hover:text-gray-900 transition-colors">Publications</a>
                            <a href="/data" className="hover:text-gray-900 transition-colors">Data Sources</a>
                            <a href="/contact" className="hover:text-gray-900 transition-colors">Contact</a>
                            <a href="https://gitlab.cvast.tuwien.ac.at/vfilipov/artvis" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors flex items-center space-x-1">
                                <span>Source</span>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                </svg>
                            </a>
                        </div>
                        <div className="text-center mt-2 text-xs text-gray-500">
                            © 2025 ArtVis Project • Art History Visualization
                        </div>
                    </div>
                </footer>
                
            </div>

            {/* Minimal Scroll to Top Button */}
            {showScrollToTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-lg transition-all duration-200 ease-in-out rounded-full shadow-md touch-manipulation"
                    title="Scroll to top"
                    aria-label="Scroll to top"
                >
                    <svg 
                        className="w-5 h-5 mx-auto" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M5 15l7-7 7 7" 
                        />
                    </svg>
                </button>
            )}
        </React.StrictMode>
    );

}

export default HomePage;