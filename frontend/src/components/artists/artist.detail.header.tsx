import React, { useState } from 'react';
import { Artist } from '../../models/artist.model';

interface ArtistDetailHeaderProps {
    artist: Artist;
    // Co-exhibition filter
    coExhibitionCount: number;
    onCoExhibitionCountChange: (count: number) => void;
    minCoExhibitions?: number;
    maxCoExhibitions?: number;
    // Grouping and ordering
    groupBy: string;
    onGroupByChange: (groupBy: string) => void;
    orderBy: string;
    onOrderByChange: (orderBy: string) => void;
    // Search functionality
    searchTerm?: string;
    onSearchChange?: (term: string) => void;
    searchResults?: Artist[];
    onArtistSelect?: (artist: Artist) => void;
    // Comparison functionality
    compareWith?: Artist | null;
    onClearComparison?: () => void;
    // Network visualization mode
    networkMode?: 'circles' | 'pies';
    onNetworkModeChange?: (mode: 'circles' | 'pies') => void;
    // Statistics
    totalExhibitions?: number;
    totalLinks?: number;
    totalArtists?: number;
}

const ArtistDetailHeader: React.FC<ArtistDetailHeaderProps> = ({
    coExhibitionCount,
    onCoExhibitionCountChange,
    minCoExhibitions = 1,
    maxCoExhibitions = 20,
    groupBy,
    onGroupByChange,
    orderBy,
    onOrderByChange,
    searchTerm = '',
    onSearchChange,
    searchResults = [],
    onArtistSelect,
    compareWith,
    onClearComparison,
    networkMode,
    onNetworkModeChange,
    totalExhibitions,
    totalLinks,
    totalArtists
}) => {
    const [showSearchResults, setShowSearchResults] = useState(false);

    const groupByOptions = [
        { value: 'country', label: 'Nationality/Country' },
        { value: 'ageGroup', label: 'Age Group' },
        { value: 'sex', label: 'Sex' }
    ];

    const orderByOptions = [
        { value: 'default', label: 'Alphabetical' },
        { value: 'coex', label: 'Co-exhibitions' },
        { value: 'age', label: 'Age up to 1915' }
    ];

    const handleSearchInputChange = (term: string) => {
        if (onSearchChange) {
            onSearchChange(term);
        }
        setShowSearchResults(term.length >= 2 && searchResults.length > 0);
    };

    const handleArtistSelectInternal = (selectedArtist: Artist) => {
        if (onArtistSelect) {
            onArtistSelect(selectedArtist);
        }
        setShowSearchResults(false);
    };

    const clearSearch = () => {
        if (onSearchChange) {
            onSearchChange('');
        }
        setShowSearchResults(false);
    };

    return (
        <nav className="bg-white border-b-2 border-black">
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
                <div className="flex items-center gap-2 flex-1 justify-end">
                    
                    {/* Co-exhibition Filter Slider */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">
                            Co-exhibitions: {coExhibitionCount}
                        </label>
                        <input
                            type="range"
                            min={minCoExhibitions}
                            max={maxCoExhibitions}
                            value={coExhibitionCount}
                            onChange={(e) => onCoExhibitionCountChange(parseInt(e.target.value))}
                            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                                background: `linear-gradient(to right, #000 0%, #000 ${((coExhibitionCount - minCoExhibitions) / (maxCoExhibitions - minCoExhibitions)) * 100}%, #e5e7eb ${((coExhibitionCount - minCoExhibitions) / (maxCoExhibitions - minCoExhibitions)) * 100}%, #e5e7eb 100%)`
                            }}
                        />
                    </div>

                    {/* Group By Control */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">Group by:</label>
                        <select 
                            className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                            value={groupBy}
                            onChange={(e) => onGroupByChange(e.target.value)}
                        >
                            {groupByOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Order By Control */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">Order by:</label>
                        <select 
                            className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                            value={orderBy}
                            onChange={(e) => onOrderByChange(e.target.value)}
                        >
                            {orderByOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Network Mode Control */}
                    {onNetworkModeChange && (
                        <div className="flex items-center gap-2">
                            <label className="text-black font-bold text-xs whitespace-nowrap">Network:</label>
                            <select 
                                className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                value={networkMode || 'circles'}
                                onChange={(e) => onNetworkModeChange(e.target.value as 'circles' | 'pies')}
                            >
                                <option value="circles">Circles</option>
                                <option value="pies">Pies</option>
                            </select>
                        </div>
                    )}

                    {/* Search Control */}
                    {onSearchChange && (
                        <div className="flex items-center gap-2 relative">
                            <label className="text-black font-bold text-xs whitespace-nowrap">Find:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search artists..."
                                    className="w-48 bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                    value={searchTerm}
                                    onChange={(e) => handleSearchInputChange(e.target.value)}
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
                                        {searchResults.map((searchArtist) => (
                                            <button
                                                key={searchArtist.id}
                                                onClick={() => handleArtistSelectInternal(searchArtist)}
                                                className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                                            >
                                                <div className="font-bold text-black text-xs">
                                                    {`${searchArtist.firstname || ''} ${searchArtist.lastname || ''}`.trim()}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {searchArtist.country} • {searchArtist.birthyear}-{searchArtist.deathyear}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Comparison Status */}
                    {compareWith && onClearComparison && (
                        <div className="flex items-center gap-2">
                            <label className="text-black font-bold text-xs whitespace-nowrap">Comparing:</label>
                            <div className="flex items-center gap-1 bg-yellow-100 border-2 border-yellow-400 px-2 py-1 rounded">
                                <span className="text-black font-bold text-xs">
                                    {`${compareWith.firstname || ''} ${compareWith.lastname || ''}`.trim()}
                                </span>
                                <button
                                    onClick={onClearComparison}
                                    className="text-black font-bold hover:bg-yellow-200 px-1 rounded"
                                    title="Clear comparison"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    )}



                    {/* Statistics */}
                    <div className="text-black font-bold text-xs whitespace-nowrap">
                        {totalArtists && `${totalArtists.toLocaleString()} artists`}
                        {totalExhibitions && ` • ${totalExhibitions.toLocaleString()} exhibitions`}
                        {totalLinks && ` • ${totalLinks.toLocaleString()} links`}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default ArtistDetailHeader;