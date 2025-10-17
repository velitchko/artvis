import React, { useEffect, useState } from 'react';
import client from '../components/apollo/client';
import GET_GROUPS from '../queries/groups';
import LoadingComponent from '../components/loading/loading';
import { Link } from 'react-router-dom';

interface GroupListItem {
    id: number;
    name: string;
    artistsMemberOfAggregate: {
        count: number;
    };
}

const GroupsPage = () => {
    const [groups, setGroups] = useState<GroupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const filteredGroups = groups.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            {/* Header */}
            <nav className="bg-white border-b-2 border-black">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <a href="/" className="flex items-center">
                            <h1 className="text-xl font-extrabold tracking-tight leading-none text-gray-900 md:text-2xl lg:text-3xl">
                                Art
                                <span className="font-face-kolker md:text-4xl lg:text-5xl">Vis</span>
                            </h1>
                        </a>
                        <h2 className="text-2xl font-bold">Artist Groups</h2>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Search */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search groups..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Group List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredGroups.map(group => (
                        <Link
                            key={group.id}
                            to={`/group/${group.id}`}
                            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                        >
                            <h3 className="text-xl font-bold mb-2">{group.name}</h3>
                            <p className="text-gray-600">
                                {group.artistsMemberOfAggregate.count} 
                                {group.artistsMemberOfAggregate.count === 1 ? ' member' : ' members'}
                            </p>
                        </Link>
                    ))}
                </div>

                {/* No results */}
                {filteredGroups.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-600 text-lg">
                            {searchTerm ? 'No groups found matching your search.' : 'No groups available.'}
                        </p>
                    </div>
                )}

                {/* Results count */}
                <div className="mt-6 text-center text-gray-600">
                    Showing {filteredGroups.length} of {groups.length} groups
                </div>
            </div>
        </div>
    );
};

export default GroupsPage;
