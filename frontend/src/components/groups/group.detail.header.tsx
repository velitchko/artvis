import React, { useState } from 'react';
import { Group } from '../../models/group.model';
import { Artist } from '../../models/artist.model';

interface GroupDetailHeaderProps {
    group: Group;
    // Statistics
    totalMembers: number;
    totalExhibitions: number;
    totalArtworks: number;
    dateRange: { min: number; max: number };
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
}

const GroupDetailHeader: React.FC<GroupDetailHeaderProps> = ({
    group,
    totalMembers,
    totalExhibitions,
    totalArtworks,
    dateRange,
    coExhibitionCount,
    onCoExhibitionCountChange,
    minCoExhibitions = 1,
    maxCoExhibitions = 20,
    groupBy,
    onGroupByChange,
    orderBy,
    onOrderByChange
}) => {
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

    return (
        <nav className="bg-white border-b-2 border-black">
            <div className="flex items-center justify-between px-4 py-2">
                {/* Logo and Group Info Section - Aligned */}
                <div className="flex items-center gap-4">
                    <a href="/" className="flex items-center">
                        <h1 className="text-xl font-extrabold tracking-tight leading-none text-gray-900 md:text-2xl lg:text-3xl">
                            Art
                            <span className="font-face-kolker md:text-4xl lg:text-5xl">Vis</span>
                        </h1>
                    </a>
                    
                    <div className="h-8 w-px bg-gray-300"></div>
                    
                    <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">{group.name}</h2>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-700">
                        <span className="font-bold">
                            {totalMembers} {totalMembers === 1 ? 'Member' : 'Members'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>
                            {totalExhibitions} {totalExhibitions === 1 ? 'Exhibition' : 'Exhibitions'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>
                            {totalArtworks} {totalArtworks === 1 ? 'Artwork' : 'Artworks'}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>
                            {dateRange.min}–{dateRange.max}
                        </span>
                    </div>
                </div>

                {/* Controls Section - Aligned */}
                <div className="flex items-center gap-2">
                    {/* Group By */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">
                            Group by:
                        </label>
                        <select
                            value={groupBy}
                            onChange={(e) => onGroupByChange(e.target.value)}
                            className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            {groupByOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Order By */}
                    <div className="flex items-center gap-2">
                        <label className="text-black font-bold text-xs whitespace-nowrap">
                            Order by:
                        </label>
                        <select
                            value={orderBy}
                            onChange={(e) => onOrderByChange(e.target.value)}
                            className="bg-white border-2 border-black text-black font-bold px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-black"
                        >
                            {orderByOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default GroupDetailHeader;
