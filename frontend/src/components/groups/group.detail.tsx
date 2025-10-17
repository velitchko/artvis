import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Group } from '../../models/group.model';
import GroupDetailHeader from './group.detail.header';
import GroupTimeline from './group.timeline';
import GroupNetwork from './group.network';
import GroupTable from './group.table';
import GroupAreaChart from './group.area.chart';
import {
    calculateGroupStatistics,
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

    // Get all exhibitions with member info
    const exhibitions = useMemo(() => {
        return getAllGroupExhibitions(group);
    }, [group]);

    // Update handlers
    const handleCoExhibitionCountChange = useCallback((count: number) => {
        setState(prev => ({ ...prev, coExhibitionCount: count }));
    }, []);

    const handleGroupByChange = useCallback((groupBy: string) => {
        setState(prev => ({ ...prev, groupBy }));
    }, []);

    const handleOrderByChange = useCallback((orderBy: string) => {
        setState(prev => ({ ...prev, orderBy }));
    }, []);

    const handleYearHover = useCallback((year: number | null) => {
        setState(prev => ({ ...prev, highlightedYear: year }));
    }, []);

    // Notify parent of loading state
    useEffect(() => {
        if (loadCallback) {
            loadCallback(false);
        }
    }, [loadCallback]);

    return (
        <div className="artist-detail-container h-screen flex flex-col overflow-hidden">
            {/* Group Detail Header */}
            <div className="flex-shrink-0">
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
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {/* Desktop: 2x2 Grid Layout matching artist detail */}
                <div className="hidden lg:flex lg:flex-col lg:h-full lg:gap-1">
                    {/* Top Row: Timeline + (Empty space for symmetry) - Compact height */}
                    <div className="top-row grid grid-cols-2 gap-2 flex-shrink-0" style={{ flex: '0 0 20%' }}>
                        {/* Timeline Section - Top Left */}
                        <div className="timeline-section h-full">
                            <div id="timeline-container" className="w-full h-full">
                                <GroupTimeline
                                    group={group}
                                    highlightedYear={state.highlightedYear}
                                    onYearHover={handleYearHover}
                                    onEgoNetworkHover={handleYearHover}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>

                        {/* Area Chart Section - Top Right */}
                        <div className="area-chart-section h-full">
                            <div id="area-chart-container" className="w-full h-full">
                                <GroupAreaChart
                                    group={group}
                                    groupBy={state.groupBy}
                                    stacked={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Table + Network */}
                    <div className="bottom-row grid grid-cols-2 gap-2 flex-1 min-h-0">
                        {/* Table Section - Bottom Left */}
                        <div className="table-section h-full overflow-hidden">
                            <div className="h-full overflow-auto">
                                <GroupTable exhibitions={exhibitions} />
                            </div>
                        </div>

                        {/* Network Section - Bottom Right */}
                        <div className="network-section h-full">
                            <div id="ego-net-container" className="h-full">
                                <GroupNetwork
                                    group={group}
                                    groupBy={state.groupBy}
                                    highlightedYear={state.highlightedYear}
                                    onYearHover={handleYearHover}
                                    onYearMouseOut={() => handleYearHover(null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile: Linear Stacked Layout with Scroll */}
                <div className="lg:hidden flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 p-4">
                    {/* Timeline Section */}
                    <div className="timeline-section flex-shrink-0" style={{ height: '200px' }}>
                        <div id="timeline-container-mobile" className="w-full h-full">
                            <GroupTimeline
                                group={group}
                                width={800}
                                height={200}
                                highlightedYear={state.highlightedYear}
                                onYearHover={handleYearHover}
                                onEgoNetworkHover={handleYearHover}
                                className="w-full h-full"
                            />
                        </div>
                    </div>

                    {/* Area Chart Section */}
                    <div className="area-chart-section flex-shrink-0" style={{ height: '150px' }}>
                        <div id="area-chart-container-mobile" className="w-full h-full">
                            <GroupAreaChart
                                group={group}
                                groupBy={state.groupBy}
                                stacked={true}
                            />
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="table-section flex-shrink-0" style={{ height: '400px' }}>
                        <div className="h-full overflow-auto">
                            <GroupTable exhibitions={exhibitions} />
                        </div>
                    </div>

                    {/* Network Section */}
                    <div className="network-section flex-shrink-0" style={{ height: '400px' }}>
                        <div id="ego-net-container-mobile" className="h-full">
                            <GroupNetwork
                                group={group}
                                width={400}
                                height={400}
                                groupBy={state.groupBy}
                                highlightedYear={state.highlightedYear}
                                onYearHover={handleYearHover}
                                onYearMouseOut={() => handleYearHover(null)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroupDetailComponent;
