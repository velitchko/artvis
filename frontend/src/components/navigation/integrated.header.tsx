import React, { useState } from 'react';
import { Artist } from '../../models/artist.model';
import SimilarityOnboardingModal from '../modal/similarity-onboarding-modal';

interface IntegratedHeaderProps {
    artists: Artist[];
    order: string;
    onOrderChange: (order: string) => void;
    columnsPerRow?: number;
    onColumnsChange?: (columns: number) => void;
    onSearchArtist?: (artistId: number | undefined) => void;
    // Similarity props
    similarityBaseArtist?: Artist | null;
    onClearSimilarity?: () => void;
    similarityConfig?: {
        algorithm: string;
        normalizeValues: boolean;
        focusOnShape: boolean;
    };
    onSimilarityConfigChange?: (config: any) => void;
    // Global timeline scaling
    timelineScaling?: 'absolute' | 'relative';
    onTimelineScalingChange?: (scaling: 'absolute' | 'relative') => void;
    // Curve rendering style
    curveRendering?: 'jagged' | 'smooth';
    onCurveRenderingChange?: (rendering: 'jagged' | 'smooth') => void;
}

const IntegratedHeader: React.FC<IntegratedHeaderProps> = ({
    artists,
    order,
    onOrderChange,
    columnsPerRow,
    onColumnsChange,
    onSearchArtist,
    similarityBaseArtist,
    onClearSimilarity,
    similarityConfig,
    onSimilarityConfigChange,
    timelineScaling,
    onTimelineScalingChange,
    curveRendering,
    onCurveRenderingChange
}) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<Artist[]>([]);
    const [showSearchResults, setShowSearchResults] = React.useState(false);
    const [showOnboardingModal, setShowOnboardingModal] = useState(false);

    const orders = [
        { value: 'name', label: 'Alphabetically' },
        { value: 'count', label: 'Exhibition Count' },
        { value: 'birth', label: 'Birth Year' },
        { value: 'country', label: 'Country' },
        { value: 'similarity', label: 'Timeline Similarity' }
    ];

    const columnOptions = [
        { value: 'auto', label: 'Auto Fit' },
        { value: 2, label: '2 per row' },
        { value: 3, label: '3 per row' },
        { value: 4, label: '4 per row' },
        { value: 5, label: '5 per row' },
        { value: 6, label: '6 per row' },
        { value: 8, label: '8 per row' },
        { value: 10, label: '10 per row' }
    ];

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        
        if (term.length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            // Clear search highlight when search term is cleared
            if (onSearchArtist) {
                onSearchArtist(undefined);
            }
            return;
        }

        const filtered = artists.filter(artist => {
            const fullName = `${artist.firstname || ''} ${artist.lastname || ''}`.toLowerCase();
            const country = (artist.country || '').toLowerCase();
            const searchLower = term.toLowerCase();
            
            return fullName.includes(searchLower) || 
                   country.includes(searchLower) ||
                   artist.birthyear?.toString().includes(searchLower) ||
                   artist.deathyear?.toString().includes(searchLower);
        }).slice(0, 10);

        setSearchResults(filtered);
        setShowSearchResults(filtered.length > 0);
    };

    const handleArtistSelect = (artist: Artist) => {
        const fullName = `${artist.firstname || ''} ${artist.lastname || ''}`.trim();
        setSearchTerm(fullName);
        setShowSearchResults(false);
        if (onSearchArtist) {
            onSearchArtist(artist.id);
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
        setSearchResults([]);
        setShowSearchResults(false);
        // Clear the search highlight
        if (onSearchArtist) {
            onSearchArtist(undefined);
        }
    };

    return (
        <nav className="bg-white border-b-2 border-black fixed top-0 left-0 right-0 z-50">
            <div className="flex items-center justify-between px-4 py-2">
                {/* Logo Section */}
                <div className="flex-shrink-0">
                    <a href="/" className="flex items-center">
                        <h1 className="text-xl font-extrabold tracking-tight leading-none text-gray-900 md:text-2xl lg:text-3xl">
                            Art
                            <span className="font-face-kolker md:text-4xl lg:text-5xl">Vis</span>
                        </h1>
                    </a>
                </div>

                {/* Toolbar Section */}
                <div className="flex items-center gap-4 flex-1 justify-end">
                    
                    {/* Similarity Controls - improved styling to match header design */}
                    {order === 'similarity' && (
                        <div className="flex items-center gap-2 bg-yellow-100 border-2 border-black px-3 py-1 flex-shrink-0">
                            {similarityBaseArtist ? (
                                <>
                                    <span className="text-black font-bold text-xs whitespace-nowrap">
                                        vs {similarityBaseArtist.firstname} {similarityBaseArtist.lastname}
                                        {similarityBaseArtist.country && ` (${similarityBaseArtist.country})`}
                                    </span>
                                    <select 
                                        value={similarityConfig?.algorithm || 'combined'}
                                        onChange={(e) => onSimilarityConfigChange?.({ 
                                            ...similarityConfig, 
                                            algorithm: e.target.value 
                                        })}
                                        className="bg-yellow-50 border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black flex-shrink-0"
                                    >
                                        <option value="combined">Combined</option>
                                        <option value="dtw">DTW</option>
                                        <option value="correlation">Correlation</option>
                                        <option value="trend">Trend</option>
                                        <option value="cross_correlation">Cross-Corr</option>
                                        <option value="frequency">Frequency</option>
                                    </select>
                                    <label className="flex items-center gap-1 text-black font-bold text-xs whitespace-nowrap flex-shrink-0">
                                        <input 
                                            type="checkbox" 
                                            checked={similarityConfig?.focusOnShape || false}
                                            onChange={(e) => onSimilarityConfigChange?.({ 
                                                ...similarityConfig, 
                                                focusOnShape: e.target.checked 
                                            })}
                                            className="accent-yellow-600"
                                        />
                                        Shape
                                    </label>
                                    <button 
                                        onClick={onClearSimilarity}
                                        className="text-black hover:text-gray-600 font-bold text-xs px-2 py-1 border-2 border-black bg-yellow-50 hover:bg-yellow-100 flex-shrink-0"
                                        title="Clear similarity mode"
                                    >
                                        Clear
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="text-black font-bold text-xs whitespace-nowrap">
                                        Select base artist: Click on any artist card
                                    </span>
                                    <button 
                                        onClick={() => onOrderChange('name')}
                                        className="text-black hover:text-gray-600 font-bold text-xs px-2 py-1 border-2 border-black bg-yellow-50 hover:bg-yellow-100 flex-shrink-0"
                                        title="Exit similarity mode"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Similarity Mode Toggle - always visible for discoverability */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onOrderChange(order === 'similarity' ? 'name' : 'similarity')}
                            className={`flex items-center gap-1 px-2 py-1 text-xs font-bold border-2 transition-colors ${
                                order === 'similarity' 
                                    ? 'bg-yellow-100 text-yellow-700 border-yellow-400' 
                                    : 'bg-white text-black border-black hover:bg-gray-50'
                            }`}
                            title={order === 'similarity' ? 'Exit similarity mode' : 'Enter similarity mode'}
                        >
                            Similarity
                        </button>
                        <div className="relative">
                            <button 
                                onClick={() => setShowOnboardingModal(true)}
                                className="text-black hover:text-gray-700 text-xs font-bold border-2 border-black hover:bg-gray-50 bg-white px-2 py-1 transition-colors"
                                title="Learn about similarity features"
                            >
                                ?
                            </button>
                        </div>
                    </div>
                    
                    {/* Sort Control */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">Sort:</label>
                        <select 
                            className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                            value={order}
                            onChange={(e) => onOrderChange(e.target.value)}
                        >
                            {orders.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Columns Control */}
                    {onColumnsChange && (
                        <div className="flex items-center gap-2">
                            <label className="text-black font-bold text-xs whitespace-nowrap">Columns:</label>
                            <select 
                                className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                value={columnsPerRow || 'auto'}
                                onChange={(e) => onColumnsChange(e.target.value === 'auto' ? 0 : parseInt(e.target.value))}
                            >
                                {columnOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Search Control */}
                    <div className="flex items-center gap-2 relative">
                        <label className="text-black font-bold text-xs whitespace-nowrap">Find:</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search artists..."
                                className="w-48 bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-black font-bold hover:bg-gray-100 px-1"
                                >
                                    ×
                                </button>
                            )}
                            
                            {/* Search Results Dropdown */}
                            {showSearchResults && (
                                <div className="absolute top-full left-0 right-0 bg-white border-2 border-black border-t-0 max-h-60 overflow-y-auto z-50">
                                    {searchResults.map((artist) => (
                                        <button
                                            key={artist.id}
                                            onClick={() => handleArtistSelect(artist)}
                                            className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                                        >
                                            <div className="font-bold text-black text-xs">
                                                {`${artist.firstname || ''} ${artist.lastname || ''}`.trim()}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {artist.country} • {artist.birthyear}-{artist.deathyear} • {artist.exhibitedAtExhibitions?.length || 0} exhibitions
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline Scaling Control - Global Setting */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">Scale:</label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${timelineScaling === 'relative' ? 'text-black' : 'text-gray-500'}`}>
                                Relative
                            </span>
                            <button
                                onClick={() => onTimelineScalingChange?.(timelineScaling === 'relative' ? 'absolute' : 'relative')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-black transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                                    timelineScaling === 'absolute' 
                                        ? 'bg-black' 
                                        : 'bg-gray-300'
                                }`}
                                title={`Switch to ${timelineScaling === 'relative' ? 'absolute' : 'relative'} scaling`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        timelineScaling === 'absolute' 
                                            ? 'translate-x-6' 
                                            : 'translate-x-1'
                                    }`}
                                />
                            </button>
                            <span className={`text-xs font-bold ${timelineScaling === 'absolute' ? 'text-black' : 'text-gray-500'}`}>
                                Absolute
                            </span>
                        </div>
                    </div>

                    {/* Curve Rendering Control */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">Curves:</label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${curveRendering === 'jagged' ? 'text-black' : 'text-gray-500'}`}>
                                Jagged
                            </span>
                            <button
                                onClick={() => onCurveRenderingChange?.(curveRendering === 'jagged' ? 'smooth' : 'jagged')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-black transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                                    curveRendering === 'smooth' 
                                        ? 'bg-black' 
                                        : 'bg-gray-300'
                                }`}
                                title={`Switch to ${curveRendering === 'jagged' ? 'smooth' : 'jagged'} curves`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        curveRendering === 'smooth' 
                                            ? 'translate-x-6' 
                                            : 'translate-x-1'
                                    }`}
                                />
                            </button>
                            <span className={`text-xs font-bold ${curveRendering === 'smooth' ? 'text-black' : 'text-gray-500'}`}>
                                Smooth
                            </span>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="text-black font-bold text-xs whitespace-nowrap">
                        {artists.length.toLocaleString()} artists
                    </div>
                </div>
            </div>
            
            {/* Onboarding Modal */}
            <SimilarityOnboardingModal 
                isOpen={showOnboardingModal}
                onClose={() => setShowOnboardingModal(false)}
            />
        </nav>
    );
};

export default IntegratedHeader;
