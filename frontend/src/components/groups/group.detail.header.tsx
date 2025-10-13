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
                {/* Logo Section */}
                <div className="flex-shrink-0">
                    <a href="/" className="flex items-center">
                        <h1 className="text-xl font-extrabold tracking-tight leading-none text-gray-900 md:text-2xl lg:text-3xl">
                            Art
                            <span className="font-face-kolker md:text-4xl lg:text-5xl">Vis</span>
                        </h1>
                    </a>
                </div>

                {/* Group Info Section */}
                <div className="flex-1 px-6">
                    <h2 className="text-2xl font-bold text-gray-900">{group.name}</h2>
                    <div className="flex gap-6 mt-1 text-sm text-gray-600">
                        <span className="font-medium">
                            {totalMembers} {totalMembers === 1 ? 'Member' : 'Members'}
                        </span>
                        <span>
                            {totalExhibitions} {totalExhibitions === 1 ? 'Exhibition' : 'Exhibitions'}
                        </span>
                        <span>
                            {totalArtworks} {totalArtworks === 1 ? 'Artwork' : 'Artworks'}
                        </span>
                        <span>
                            Active: {dateRange.min}–{dateRange.max}
                        </span>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="flex items-center gap-4">
                    {/* Co-Exhibition Filter */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">
                            Min Co-exhibitions:
                        </label>
                        <input
                            type="number"
                            min={minCoExhibitions}
                            max={maxCoExhibitions}
                            value={coExhibitionCount}
                            onChange={(e) => onCoExhibitionCountChange(Number(e.target.value))}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Group By */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">
                            Group by:
                        </label>
                        <select
                            value={groupBy}
                            onChange={(e) => onGroupByChange(e.target.value)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <label className="text-sm font-medium text-gray-700">
                            Order by:
                        </label>
                        <select
                            value={orderBy}
                            onChange={(e) => onOrderByChange(e.target.value)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
