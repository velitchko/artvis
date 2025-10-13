import React, { useMemo, useState } from 'react';
import { Exhibition } from '../../models/exhibition.model';
import { Artist } from '../../models/artist.model';

interface GroupTableProps {
    exhibitions: Array<Exhibition & { exhibitingMembers: Artist[] }>;
}

const GroupTable: React.FC<GroupTableProps> = ({ exhibitions }) => {
    const [sortField, setSortField] = useState<'year' | 'title' | 'members' | 'artworks'>('year');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [filterText, setFilterText] = useState('');

    // Sort and filter exhibitions
    const sortedExhibitions = useMemo(() => {
        let filtered = exhibitions;

        // Apply text filter
        if (filterText) {
            const lowerFilter = filterText.toLowerCase();
            filtered = exhibitions.filter(ex => 
                ex.title.toLowerCase().includes(lowerFilter) ||
                ex.exhibitingMembers.some(m => m.sortname.toLowerCase().includes(lowerFilter))
            );
        }

        // Sort
        return [...filtered].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'year':
                    comparison = +a.startyear - +b.startyear;
                    break;
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'members':
                    comparison = a.exhibitingMembers.length - b.exhibitingMembers.length;
                    break;
                case 'artworks':
                    const aCount = a.exhibitsItems?.length || 0;
                    const bCount = b.exhibitsItems?.length || 0;
                    comparison = aCount - bCount;
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [exhibitions, sortField, sortDirection, filterText]);

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const getSortIcon = (field: typeof sortField) => {
        if (sortField !== field) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    };

    return (
        <div className="w-full">
            {/* Filter */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Filter exhibitions..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('year')}
                            >
                                Year {getSortIcon('year')}
                            </th>
                            <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('title')}
                            >
                                Title {getSortIcon('title')}
                            </th>
                            <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('members')}
                            >
                                Members {getSortIcon('members')}
                            </th>
                            <th
                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('artworks')}
                            >
                                Artworks {getSortIcon('artworks')}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedExhibitions.map(exhibition => (
                            <tr key={exhibition.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {exhibition.startyear}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                    {exhibition.title}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    <div className="flex flex-wrap gap-1">
                                        {exhibition.exhibitingMembers.map((member, idx) => (
                                            <span
                                                key={member.id}
                                                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                            >
                                                {member.sortname}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {exhibition.exhibitsItems?.length || 0}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Results count */}
            <div className="mt-2 text-sm text-gray-600">
                Showing {sortedExhibitions.length} of {exhibitions.length} exhibitions
            </div>
        </div>
    );
};

export default GroupTable;
