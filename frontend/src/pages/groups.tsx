import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import GET_GROUPS from '../queries/groups';
import LoadingComponent from '../components/loading/loading';
import GroupCard from '../components/groups/group.card';

interface GroupListItem {
    id: number;
    name: string;
    artistsMemberOfAggregate: {
        count: number;
    };
    artistsMemberOf?: Array<{
        id: number;
        exhibitedAtExhibitions?: Array<{
            id: number;
            startyear: number;
        }>;
    }>;
}

const GroupsPage = () => {
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [order, setOrder] = useState('name'); // 'name' or 'members'

    useEffect(() => {
        client.query({
            query: GET_GROUPS
        })
        .then(result => {
            setGroups(result.data.groups || []);
            setLoading(false);
        })
        .catch(err => {
            console.error('Error loading groups:', err);
            setError('Error loading groups');
            setLoading(false);
        });
    }, []);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setShowSearchResults(term.length >= 2);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setShowSearchResults(false);
    };

    // Filter and sort groups
    const filteredAndSortedGroups = groups
        .filter(group => 
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (order === 'name') {
                return a.name.localeCompare(b.name);
            } else if (order === 'members') {
                return b.artistsMemberOfAggregate.count - a.artistsMemberOfAggregate.count;
            }
            return 0;
        });

    if (loading) {
        return (
            <LoadingComponent 
                overlay={true} 
                size="large" 
                showLogo={true}
            />
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Integrated Header */}
            <nav className="bg-white border-b-2 border-black sticky top-0 z-50">
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

                    <div className="h-8 w-px bg-gray-300 mx-4"></div>

                    <h2 className="text-lg font-bold text-gray-900">Artist Groups</h2>

                    {/* Toolbar Section */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        {/* Order By Control */}
                        <div className="flex items-center gap-2">
                            <label className="text-black font-bold text-xs whitespace-nowrap">Order by:</label>
                            <select 
                                className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                value={order}
                                onChange={(e) => setOrder(e.target.value)}
                            >
                                <option value="name">Alphabetically</option>
                                <option value="members">Member Count</option>
                            </select>
                        </div>

                        {/* Search Control */}
                        <div className="flex items-center gap-2 relative">
                            <label className="text-black font-bold text-xs whitespace-nowrap">Find:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search groups..."
                                    className="w-48 bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-black font-bold hover:bg-gray-100 px-1"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Results count */}
                <div className="mb-4 text-sm text-gray-600">
                    Showing {filteredAndSortedGroups.length} of {groups.length} groups
                </div>

                {/* Group Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAndSortedGroups.map(group => (
                        <GroupCard key={group.id} group={group} />
                    ))}
                </div>

                {/* No results */}
                {filteredAndSortedGroups.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-600 text-lg">
                            {searchTerm ? 'No groups found matching your search.' : 'No groups available.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupsPage;
