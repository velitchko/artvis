import React, { useMemo, useState } from 'react';
import { Exhibition } from '../../models/exhibition.model';
import { Artist } from '../../models/artist.model';

interface GroupTableProps {
    exhibitions: Array<Exhibition & { exhibitingMembers: Artist[] }>;
}

const GroupTable: React.FC<GroupTableProps> = ({ exhibitions }) => {
    const [sortField, setSortField] = useState<'year' | 'title' | 'members' | 'artworks'>('year');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    

    

    // Precompute per-exhibition counts of items created by the group's members
    const exhibitionsWithMemberItemCounts = useMemo(() => {
        return exhibitions.map(exhibition => {
            const memberIds = new Set<number>((exhibition.exhibitingMembers || []).map(m => +m.id));
            const items = (exhibition.exhibitsItems || []);
            const memberItemIds = new Set<number>();

            items.forEach(item => {
                const creators = (item.artistsCreated || []).map((a: Artist) => +a.id);
                // if any creator is in the group's member set, count the item
                if (creators.some(id => memberIds.has(id))) {
                    memberItemIds.add(+item.id);
                }
            });

            return {
                ...exhibition,
                __memberItemsCount: memberItemIds.size
            } as Exhibition & { exhibitingMembers: Artist[] } & { __memberItemsCount: number };
        });
    }, [exhibitions]);

    // Sort exhibitions
    const sortedExhibitions = useMemo(() => {
        return [...exhibitionsWithMemberItemCounts].sort((a, b) => {
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
                    // sort by number of items in the exhibition that were created by group members
                    const aCount = (a as any).__memberItemsCount || 0;
                    const bCount = (b as any).__memberItemsCount || 0;
                    comparison = aCount - bCount;
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [exhibitionsWithMemberItemCounts, sortField, sortDirection]);

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    return (
        <div className="table-container h-full flex flex-col">
            {/* Table */}
            <div 
                className="flex-1 overflow-y-scroll border border-gray-300 rounded"
                style={{
                    minHeight: 0,
                    maxHeight: '100%'
                }}
            >
                <table className="w-full text-left text-black">
                    <thead className="text-xs bg-black text-white uppercase sticky top-0 z-10">
                        <tr>
                            <th
                                scope="col"
                                className="px-2 py-2 border-r border-gray-300 cursor-pointer hover:bg-gray-800"
                                onClick={() => handleSort('year')}
                            >
                                <div className="flex items-center justify-between">
                                    Year
                                    <span className="ml-1">
                                        {sortField === 'year' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </span>
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-2 py-2 border-r border-gray-300 cursor-pointer hover:bg-gray-800"
                                onClick={() => handleSort('title')}
                            >
                                <div className="flex items-center justify-between">
                                    Title
                                    <span className="ml-1">
                                        {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </span>
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-2 py-2 border-r border-gray-300 cursor-pointer hover:bg-gray-800"
                                onClick={() => handleSort('members')}
                            >
                                <div className="flex items-center justify-between">
                                    Members
                                    <span className="ml-1">
                                        {sortField === 'members' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </span>
                                </div>
                            </th>
                            <th
                                scope="col"
                                className="px-2 py-2 border-r border-gray-300 cursor-pointer hover:bg-gray-800"
                                onClick={() => handleSort('artworks')}
                            >
                                <div className="flex items-center justify-between">
                                    Artworks
                                    <span className="ml-1">
                                        {sortField === 'artworks' && (sortDirection === 'asc' ? '↑' : '↓')}
                                    </span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedExhibitions.map((exhibition, index) => (
                            <tr 
                                key={exhibition.id} 
                                className={`border-b ${
                                    index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                } hover:bg-blue-50 transition-colors`}
                            >
                                <td className="px-2 py-2 border-r border-gray-300 text-sm whitespace-nowrap">
                                    {exhibition.startyear}
                                </td>
                                <td className="px-2 py-2 border-r border-gray-300 text-sm">
                                    {exhibition.title}
                                </td>
                                <td className="px-2 py-2 border-r border-gray-300 text-sm">
                                    <div className="flex flex-wrap gap-1">
                                        {exhibition.exhibitingMembers.map((member) => (
                                            <span
                                                key={member.id}
                                                className="inline-block px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200"
                                                onClick={() => window.location.href = `/artist/${member.id}`}
                                            >
                                                {member.sortname}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-2 py-2 border-r border-gray-300 text-sm whitespace-nowrap">
                                    {/* Show only items in the exhibition that were created by group members */}
                                    {(exhibition as any).__memberItemsCount ?? ((exhibition.exhibitsItems||[]).length || 0)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GroupTable;
