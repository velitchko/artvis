import React from 'react';

interface LoadingComponentProps {
    message?: string;
    showLogo?: boolean;
    size?: 'small' | 'medium' | 'large';
    overlay?: boolean; // Full screen overlay
}

const LoadingComponent: React.FC<LoadingComponentProps> = ({ 
    message, 
    showLogo = true, 
    size = 'medium',
    overlay = false 
}) => {
    const catchyMessages = [
        'Brushing up on art history... Hold tight!',
        'Uncovering masterpieces... Just a moment!',
        'Painting a picture of data... Almost there!',
        'Dusting off old canvases... Please wait!',
        'Sculpting your results... Hang on!',
        'Restoring the Renaissance... Fetching data!',
        'Channeling our inner art historian... Loading!',
        'Analyzing ancient art... One sec!',
        'Polishing our Monets... Data incoming!',
        'Digging through digital archives... Almost done!',
        'Curating your collection... Please wait!',
        'Mixing pigments of knowledge... Loading!',
        'Framing the perfect data... Just a moment!',
        'Adjusting the gallery lights... Almost ready!',
        'Consulting with the masters... Hang tight!'
    ];

    // Use provided message or pick a random catchy one
    const displayMessage = message || catchyMessages[Math.floor(Math.random() * catchyMessages.length)];
    
    // Size configurations
    const sizeConfig = {
        small: {
            spinner: 'h-8 w-8',
            text: 'text-sm',
            logo: 'text-2xl',
            container: 'gap-2'
        },
        medium: {
            spinner: 'h-12 w-12',
            text: 'text-lg',
            logo: 'text-4xl',
            container: 'gap-4'
        },
        large: {
            spinner: 'h-16 w-16',
            text: 'text-2xl',
            logo: 'text-6xl',
            container: 'gap-6'
        }
    };

    const config = sizeConfig[size];

    const content = (
        <div className={`flex flex-col items-center justify-center ${config.container}`}>
            {showLogo && (
                <div className={`font-face-kolker ${config.logo} font-bold text-black mb-2`}>
                    ArtVis
                </div>
            )}
            
            <div className="flex items-center gap-3">
                {/* Animated spinner */}
                <div className={`animate-spin rounded-full border-4 border-gray-300 border-t-black ${config.spinner}`}></div>
                
                {/* Loading message */}
                <p className={`${config.text} text-black font-medium max-w-md text-center`}>
                    {displayMessage}
                </p>
            </div>
        </div>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm">
                {content}
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-8">
            {content}
        </div>
    );
};

export default LoadingComponent;