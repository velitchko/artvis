import React, { useEffect, useState, useMemo } from 'react';
import { Group } from '../../models/group.model';
import GroupDetailHeader from './group.detail.header';
import GroupTimeline from './group.timeline';
import GroupNetwork from './group.network';
import GroupTable from './group.table';
import {
    calculateGroupStatistics,
    generateGroupNetworkData,
    getAllGroupExhibitions
} from '../../utils/groupUtils';

interface GroupDetailProps {
    group: Group;
    loadCallback?: (loading: boolean) => void;
}

interface GroupDetailState {
    coExhibitionCount: number;
    groupBy: string;
    orderBy: string;
    highlightedYear: number | null;
}

const GroupDetailComponent: React.FC<GroupDetailProps> = ({ 
    group, 
    loadCallback 
}) => {
    const [state, setState] = useState<GroupDetailState>({
        coExhibitionCount: 3,
        groupBy: 'country',
        orderBy: 'coex',
        highlightedYear: null
    });

    // Calculate statistics
    const statistics = useMemo(() => {
        return calculateGroupStatistics(group);
    }, [group]);

    // Generate network data
    const networkLinks = useMemo(() => {
        return generateGroupNetworkData(group);
    }, [group]);

    // Get all exhibitions with member info
    const exhibitions = useMemo(() => {
        return getAllGroupExhibitions(group);
    }, [group]);

    // Update handlers
    const handleCoExhibitionCountChange = (count: number) => {
        setState(prev => ({ ...prev, coExhibitionCount: count }));
    };

    const handleGroupByChange = (groupBy: string) => {
        setState(prev => ({ ...prev, groupBy }));
    };

    const handleOrderByChange = (orderBy: string) => {
        setState(prev => ({ ...prev, orderBy }));
    };

    const handleYearHover = (year: number | null) => {
        setState(prev => ({ ...prev, highlightedYear: year }));
    };

    // Notify parent of loading state
    useEffect(() => {
        if (loadCallback) {
            loadCallback(false);
        }
    }, [loadCallback]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <GroupDetailHeader
                group={group}
                totalMembers={statistics.totalMembers}
                totalExhibitions={statistics.totalExhibitions}
                totalArtworks={statistics.totalArtworks}
                dateRange={statistics.dateRange}
                coExhibitionCount={state.coExhibitionCount}
                onCoExhibitionCountChange={handleCoExhibitionCountChange}
                groupBy={state.groupBy}
                onGroupByChange={handleGroupByChange}
                orderBy={state.orderBy}
                onOrderByChange={handleOrderByChange}
            />

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Group Info Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">Group Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Members</p>
                            <p className="text-2xl font-bold">{statistics.totalMembers}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Exhibitions</p>
                            <p className="text-2xl font-bold">{statistics.totalExhibitions}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Artworks</p>
                            <p className="text-2xl font-bold">{statistics.totalArtworks}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Active Period</p>
                            <p className="text-2xl font-bold">
                                {statistics.dateRange.min}–{statistics.dateRange.max}
                            </p>
                        </div>
                    </div>

                    {/* Member List */}
                    <div className="mt-6">
                        <h4 className="text-lg font-semibold mb-2">Group Members</h4>
                        <div className="flex flex-wrap gap-2">
                            {group.artistsMemberOf.map(member => (
                                <a
                                    key={member.id}
                                    href={`/artist/${member.id}`}
                                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                                >
                                    {member.sortname}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">Exhibition Timeline</h3>
                    <div style={{ height: '250px' }}>
                        <GroupTimeline
                            group={group}
                            highlightedYear={state.highlightedYear}
                            onYearHover={handleYearHover}
                        />
                    </div>
                </div>

                {/* Network and Stats Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Network Section */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-bold mb-4">Member Co-Exhibition Network</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Shows connections between group members based on shared exhibitions
                        </p>
                        <div style={{ height: '500px' }}>
                            <GroupNetwork
                                group={group}
                                links={networkLinks}
                                coExhibitionCount={state.coExhibitionCount}
                                groupBy={state.groupBy}
                                highlightedYear={state.highlightedYear}
                            />
                        </div>
                    </div>

                    {/* Statistics Section */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-bold mb-4">Group Statistics</h3>
                        
                        <div className="space-y-4">
                            {/* Members by Country */}
                            <div>
                                <h4 className="font-semibold mb-2">Members by Country</h4>
                                <div className="space-y-1">
                                    {Object.entries(
                                        group.artistsMemberOf.reduce((acc, member) => {
                                            const country = member.country || 'Unknown';
                                            acc[country] = (acc[country] || 0) + 1;
                                            return acc;
                                        }, {} as Record<string, number>)
                                    )
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([country, count]) => (
                                        <div key={country} className="flex justify-between">
                                            <span className="text-sm">{country}</span>
                                            <span className="text-sm font-medium">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Members by Sex */}
                            <div>
                                <h4 className="font-semibold mb-2">Members by Sex</h4>
                                <div className="space-y-1">
                                    {Object.entries(
                                        group.artistsMemberOf.reduce((acc, member) => {
                                            const sex = member.sex || 'Unknown';
                                            acc[sex] = (acc[sex] || 0) + 1;
                                            return acc;
                                        }, {} as Record<string, number>)
                                    )
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([sex, count]) => (
                                        <div key={sex} className="flex justify-between">
                                            <span className="text-sm">{sex}</span>
                                            <span className="text-sm font-medium">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Network Statistics */}
                            <div>
                                <h4 className="font-semibold mb-2">Network Statistics</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-sm">Total Connections</span>
                                        <span className="text-sm font-medium">{networkLinks.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm">Avg Co-exhibitions</span>
                                        <span className="text-sm font-medium">
                                            {networkLinks.length > 0
                                                ? (networkLinks.reduce((sum, link) => 
                                                    sum + (link.props?.data?.count || 0), 0) / networkLinks.length).toFixed(1)
                                                : '0'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold mb-4">All Group Exhibitions</h3>
                    <GroupTable exhibitions={exhibitions} />
                </div>
            </div>
        </div>
    );
};

export default GroupDetailComponent;
