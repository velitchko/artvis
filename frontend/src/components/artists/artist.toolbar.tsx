import React, { useState } from 'react';
import { Artist } from '../../models/artist.model';

interface ArtistToolbarProps {
    artists: Artist[];
    order: string;
    onOrderChange: (order: string) => void;
    columnsPerRow?: number;
    onColumnsChange?: (columns: number) => void;
    onSearchArtist?: (artistId: number) => void;
}

const ArtistToolbar: React.FC<ArtistToolbarProps> = ({
    artists,
    order,
    onOrderChange,
    columnsPerRow,
    onColumnsChange,
    onSearchArtist
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Artist[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const orders = [
        { value: 'name', label: 'Alphabetically' },
        { value: 'count', label: 'Exhibition Count' },
        { value: 'birth', label: 'Birth Year' },
        { value: 'country', label: 'Country' }
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
        }).slice(0, 10); // Limit to 10 results

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
    };

    return (
        <div className="bg-white border-b-2 border-black py-4 px-4 mb-4">
            <div className="flex flex-wrap items-center gap-6 max-w-full">
                
                {/* Sort/Order Control */}
                <div className="flex items-center gap-2">
                    <label className="text-black font-bold text-sm">Sort:</label>
                    <select 
                        className="bg-white border-2 border-black text-black font-bold px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
                        <label className="text-black font-bold text-sm">Columns:</label>
                        <select 
                            className="bg-white border-2 border-black text-black font-bold px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
                <div className="flex items-center gap-2 relative flex-1 max-w-md">
                    <label className="text-black font-bold text-sm">Find:</label>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search artists..."
                            className="w-full bg-white border-2 border-black text-black font-bold px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
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
                                        <div className="font-bold text-black text-sm">
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

                {/* Statistics */}
                <div className="text-black font-bold text-sm">
                    {artists.length.toLocaleString()} artists
                </div>
            </div>
        </div>
    );
};

export default ArtistToolbar;
