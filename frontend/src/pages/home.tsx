import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeadingComponent from '../components/heading/heading';
import ParticlesComponent from '../components/particles/particles';
import SearchComponent from '../components/search/search';
import NavigationComponent from '../components/navigation/navigation';
import GET_EVERYTHING from '../queries/everything';

const HomePage = (props: any) => {
    const navigate = useNavigate();
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    const title = {
        maintitle: 'ArtVis',
        subtitle: 'Art History Visualized'
    };

    const handleClick = (id: string) => {
        console.log('navigating to ' + id);
        // go to the artist detail page 

        navigate('/artist/' + id);
    }

    // Show/hide scroll to top button based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowScrollToTop(scrollTop > 300);
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
            <NavigationComponent showHeading={false} />
            <ParticlesComponent />
            <div className="w-full flex h-[75vh] justify-center items-center mx-auto">
                <HeadingComponent {...title} />
                <div className="fixed w-full h-full">
                    <div className="w-10/12 h-screen translate-y-[60%] flex-col justify-center mx-auto">
                        <SearchComponent query={GET_EVERYTHING} onClick={handleClick} />
                    </div>
                </div>
            </div>

            {/* Floating Scroll to Top Button - Always visible for debugging */}
            <button
                onClick={scrollToTop}
                className="fixed bottom-4 right-4 z-[9999] w-12 h-12 bg-black text-white border-2 border-white hover:bg-gray-800 hover:border-gray-300 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-105 rounded-full"
                title="Scroll to top"
                aria-label="Scroll to top"
                style={{
                    position: 'fixed',
                    bottom: '16px',
                    right: '16px',
                    zIndex: 99999,
                    backgroundColor: 'black',
                    border: '2px solid white'
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
        </React.StrictMode>
    );

}

export default HomePage;