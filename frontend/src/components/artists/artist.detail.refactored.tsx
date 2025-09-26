import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import client from '../apollo/client';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import EgoNetworkComponent from '../network/ego.network.refactored';
import AreaChartComponent from '../linechart/area.chart.refactored';
import TableComponent from '../table/table.refactored';
import ArtistTimeline from './artist.timeline';
import ArtistDetailHeader from './artist.detail.header';
import GET_ARTIST_EXHIBITIONS_BY_ID from '../../queries/artistExhibitionsById';
import GET_EXHIBITION from '../../queries/exhibition';

// Types
interface ArtistDetailProps {
    artist: Artist;
    loadCallback: (loading: boolean) => void;
}

interface ArtistDetailState {
    compareWith: Artist | null;
    exhibitionsList: Exhibition[];
    baseNode: Node;
    links: Link[];
    rendered: boolean;
    baseNumberOfArtworks: number;
    compareNumberOfArtworks: number;
    colors: { group: string; colors: Map<string, string> };
    dimensions: { width: number; height: number };
    // Visualization controls
    coExhibitionCount: number;
    groupBy: string;
    orderBy: string;
    networkMode: 'circles' | 'pies';
    // Search functionality
    searchTerm: string;
    searchResults: Artist[];
}

interface TimelineData {
    year: number;
    exhibitions: number;
    items: number;
}

interface D3Elements {
    svg?: d3.Selection<any, any, any, any>;
    baseTimeline?: d3.Selection<any, any, any, any>;
    compareTimeline?: d3.Selection<any, any, any, any>;
    xAxis?: d3.Selection<any, any, any, any>;
    yAxis?: d3.Selection<any, any, any, any>;
    tooltip?: d3.Selection<any, any, any, any>;
    xScale?: d3.ScaleLinear<number, number>;
    yScale?: d3.ScaleLinear<number, number>;
    rScale?: d3.ScalePower<number, number>;
}

// Constants
const YEAR_RANGE = { min: 1905, max: 1915 };
const DEFAULT_DIMENSIONS = { width: 500, height: 250 };
const MARGINS = { top: 30, bottom: 30, left: 30, right: 30 };

// Custom hooks
const useResizeObserver = (elementId: string) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            const element = document.getElementById(elementId);
            if (element) {
                setDimensions({
                    width: element.clientWidth,
                    height: element.clientHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [elementId]);

    return dimensions;
};

// Utility functions
const calculateAge = (birthYear: number): number => {
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
};

const processExhibitionData = (exhibitions: Exhibition[]): TimelineData[] => {
    const exhibitionsPerYear = new Map<number, Set<number>>();
    const itemsPerYear = new Map<number, number>();

    exhibitions.forEach((exhibition: Exhibition) => {
        const year = exhibition.startyear;
        
        if (year >= YEAR_RANGE.min && year <= YEAR_RANGE.max) {
            if (!exhibitionsPerYear.has(year)) {
                exhibitionsPerYear.set(year, new Set());
            }
            exhibitionsPerYear.get(year)?.add(exhibition.id);

            const itemCount = exhibition.exhibitsItems?.length || 0;
            itemsPerYear.set(year, (itemsPerYear.get(year) || 0) + itemCount);
        }
    });

    const exhibitionData = Array.from(exhibitionsPerYear.entries())
        .map(([year, set]) => ({ year, count: set.size }))
        .sort((a, b) => a.year - b.year);

    const itemsData = Array.from(itemsPerYear.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

    return exhibitionData.map(exhibition => {
        const items = itemsData.find(item => item.year === exhibition.year)?.count || 0;
        return {
            year: exhibition.year,
            exhibitions: exhibition.count,
            items
        };
    });
};

const generateNetworkData = (artist: Artist): Link[] => {
    console.log('Generating network data for artist:', artist.sortname);
    console.log('coExhibitedArtists:', artist.coExhibitedArtists?.length || 0);
    console.log('artistsCoExhibited:', artist.artistsCoExhibited?.length || 0);
    
    const source: Node = {
        id: artist.id,
        name: artist.sortname,
        type: 'artist',
        props: { data: artist }
    };

    const links: Link[] = [];
    const coexhibMap: Map<number, Set<{ year: number, exhibitionIds: Set<number> }>> = new Map();

    // Process coExhibitedArtists
    artist.coExhibitedArtists?.forEach((coArtist: Artist) => {
        console.log('Processing coExhibitedArtist:', coArtist.sortname, 'with', coArtist.exhibitedAtExhibitions?.length || 0, 'exhibitions');
        coArtist.exhibitedAtExhibitions?.forEach((exhibition: Exhibition) => {
            // Check if source artist also exhibited in this exhibition
            const sourceExhibition = artist.exhibitedAtExhibitions?.find((ex: Exhibition) => ex.id === exhibition.id);

            if (!sourceExhibition) return;

            const year = +exhibition.startyear;
            const key = coArtist.id;

            if (coexhibMap.has(key)) {
                const value = coexhibMap.get(key) as Set<{ year: number, exhibitionIds: Set<number> }>;
                const yearData = Array.from(value).find((d: { year: number, exhibitionIds: Set<number> }) => d.year === year);

                if (yearData) {
                    yearData.exhibitionIds.add(exhibition.id);
                } else {
                    value.add({ year, exhibitionIds: new Set<number>([exhibition.id]) });
                }
            } else {
                coexhibMap.set(key, new Set<{ year: number, exhibitionIds: Set<number> }>([{ year, exhibitionIds: new Set<number>([exhibition.id]) }]));
            }
        });
    });

    // Process artistsCoExhibited
    artist.artistsCoExhibited?.forEach((coArtist: Artist) => {
        console.log('Processing artistsCoExhibited:', coArtist.sortname, 'with', coArtist.exhibitedAtExhibitions?.length || 0, 'exhibitions');
        coArtist.exhibitedAtExhibitions?.forEach((exhibition: Exhibition) => {
            // Check if source artist also exhibited in this exhibition
            const sourceExhibition = artist.exhibitedAtExhibitions?.find((ex: Exhibition) => ex.id === exhibition.id);

            if (!sourceExhibition) return;

            const year = +exhibition.startyear;
            const key = coArtist.id;

            if (coexhibMap.has(key)) {
                const value = coexhibMap.get(key) as Set<{ year: number, exhibitionIds: Set<number> }>;
                const yearData = Array.from(value).find((d: { year: number, exhibitionIds: Set<number> }) => d.year === year);

                if (yearData) {
                    yearData.exhibitionIds.add(exhibition.id);
                } else {
                    value.add({ year, exhibitionIds: new Set<number>([exhibition.id]) });
                }
            } else {
                coexhibMap.set(key, new Set<{ year: number, exhibitionIds: Set<number> }>([{ year, exhibitionIds: new Set<number>([exhibition.id]) }]));
            }
        });
    });

    console.log('CoexhibMap size:', coexhibMap.size);

    // Generate links from coexhibition data
    coexhibMap.forEach((value, key) => {
        let found: Artist | undefined = artist.coExhibitedArtists?.find((artist: Artist) => artist.id === key);

        if (!found) {
            found = artist.artistsCoExhibited?.find((artist: Artist) => artist.id === key);
        }

        if (!found) {
            console.log(key + ' not found');
            return;
        }

        const target: Node = {
            id: key,
            name: found.sortname,
            type: 'artist',
            props: { data: found }
        };

        // iterate over value set
        value.forEach((item: { year: number, exhibitionIds: Set<number> }) => {
            const link: Link = {
                sourceId: +source.id,
                targetId: +target.id,
                props: {
                    data: {
                        year: item.year,
                        count: item.exhibitionIds.size
                    }
                },
                source: source,
                target: target
            };

            links.push(link);
        });
    });

    console.log('Generated', links.length, 'links');
    return links;
};

const createTimelineWithMissingYears = (data: TimelineData[]): TimelineData[] => {
    const years = Array.from(
        { length: YEAR_RANGE.max - YEAR_RANGE.min + 1 }, 
        (_, i) => i + YEAR_RANGE.min
    );

    return years.map(year => {
        const existing = data.find(d => d.year === year);
        return existing || { year, exhibitions: 0, items: 0 };
    });
};

// Main component
const ArtistDetailComponent: React.FC<ArtistDetailProps> = ({ 
    artist, 
    loadCallback 
}) => {
    // Refs
    const d3ElementsRef = useRef<D3Elements>({});
    const egoNetworkRef = useRef<HTMLDivElement>(null);
    const areaChartRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);
    const isLoadedRef = useRef(false);
    const showNetworkRef = useRef(false);

    // State
    const [state, setState] = useState<ArtistDetailState>({
        compareWith: null,
        exhibitionsList: [],
        baseNode: {} as Node,
        links: [],
        rendered: false,
        baseNumberOfArtworks: 0,
        compareNumberOfArtworks: 0,
        colors: { group: 'country', colors: new Map<string, string>() },
        dimensions: DEFAULT_DIMENSIONS,
        // Visualization controls
        coExhibitionCount: 3,
        groupBy: 'country',
        orderBy: 'coexhibitions',
        networkMode: 'circles',
        // Search functionality
        searchTerm: '',
        searchResults: []
    });

    // Custom hooks
    const timelineDimensions = useResizeObserver('timeline-container');

    // Memoized calculations
    const timelineData = useMemo(() => {
        if (!state.exhibitionsList.length) return [];
        return processExhibitionData(state.exhibitionsList);
    }, [state.exhibitionsList]);

    const extentData = useMemo(() => {
        if (!timelineData.length) return {
            baseItemCountExtentAbs: [0, 0] as [number, number],
            baseItemCountExtentAvg: [0, 0] as [number, number]
        };

        return {
            baseItemCountExtentAbs: d3.extent(timelineData, d => d.items) as [number, number],
            baseItemCountExtentAvg: d3.extent(timelineData, d => d.exhibitions > 0 ? d.items / d.exhibitions : 0) as [number, number]
        };
    }, [timelineData]);

    // Effects
    // Initialize baseNode from artist
    useEffect(() => {
        if (artist && artist.id) {
            console.log('Artist data loaded:', {
                id: artist.id,
                sortname: artist.sortname,
                country: artist.country,
                sex: artist.sex,
                coExhibitedArtists: artist.coExhibitedArtists?.length || 0,
                artistsCoExhibited: artist.artistsCoExhibited?.length || 0,
                exhibitedAtExhibitions: artist.exhibitedAtExhibitions?.length || 0
            });

            const baseNode: Node = {
                id: artist.id,
                name: artist.sortname || 'Unknown Artist',
                type: 'artist',
                props: {
                    data: {
                        birthyear: artist.birthyear,
                        deathyear: artist.deathyear,
                        country: artist.country,
                        sex: artist.sex
                    }
                }
            };

            console.log('Created baseNode:', baseNode);

            setState(prev => ({
                ...prev,
                baseNode
            }));
        }
    }, [artist]);

    // Initialize color schemes based on grouping
    useEffect(() => {
        if (timelineDimensions.width && timelineDimensions.height) {
            setState(prev => ({
                ...prev,
                dimensions: {
                    width: timelineDimensions.width,
                    height: timelineDimensions.height - 50
                }
            }));
        }
    }, [timelineDimensions]);

    useEffect(() => {
        if (state.dimensions.width && state.dimensions.height && artist.id) {
            loadCallback(true);
            initializeTimeline();
            fetchArtworkCounts();
        }
    }, [state.dimensions, artist.id, loadCallback]);

    useEffect(() => {
        if (state.exhibitionsList.length > 0 && state.dimensions.width > 0) {
            drawTimeline();
            loadCallback(false);
        }
    }, [state.exhibitionsList, state.dimensions, loadCallback]);

    // Callbacks
    const initializeTimeline = useCallback(() => {
        const { width, height } = state.dimensions;
        
        // Clear existing timeline
        d3.select('#artist-detail-timeline').selectAll('*').remove();

        const svg = d3.select('#artist-detail-timeline')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('overflow', 'visible');

        const timelineContainer = svg.append('g')
            .attr('class', 'timeline-container')
            .append('rect')
            .attr('id', 'timeline-background')
            .attr('fill', 'transparent');

        const baseTimeline = svg.select('.timeline-container')
            .append('g')
            .attr('id', 'base-timeline');
            
        const compareTimeline = svg.select('.timeline-container')
            .append('g')
            .attr('id', 'compare-timeline');

        // Setup scales
        const xScale = d3.scaleLinear()
            .range([MARGINS.left * 2, width - (MARGINS.right / 2)]);
            
        const yScale = d3.scaleLinear()
            .range([height - MARGINS.top, MARGINS.top]);
            
        const rScale = d3.scaleSqrt()
            .range([5, 20]);

        // Setup axes
        const xAxis = svg.append('g')
            .attr('transform', `translate(0, ${height - MARGINS.bottom})`)
            .attr('class', 'x-axis');

        const yAxis = svg.append('g')
            .attr('transform', `translate(${MARGINS.left + 10}, 0)`)
            .attr('class', 'y-axis');

        // Add axis labels
        svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', width / 2)
            .attr('y', height)
            .attr('text-anchor', 'middle')
            .text('Year');

        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('x', -height / 2)
            .attr('y', MARGINS.left / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Exhibitions');

        // Setup tooltip
        const tooltip = svg.append('g').attr('id', 'line-tooltip');

        // Store D3 elements
        d3ElementsRef.current = {
            svg,
            baseTimeline,
            compareTimeline,
            xAxis,
            yAxis,
            tooltip,
            xScale,
            yScale,
            rScale
        };

        // Fetch exhibition data
        fetchExhibitionData();
    }, [state.dimensions]);

    const fetchExhibitionData = useCallback(async () => {
        try {
            console.log('=== FETCHING EXHIBITION DATA ===');
            console.log('Artist ID:', artist.id);
            console.log('Query:', GET_ARTIST_EXHIBITIONS_BY_ID);
            
            loadCallback(true);
            const result = await client.query({
                query: GET_ARTIST_EXHIBITIONS_BY_ID,
                variables: { searchId: artist.id }
            });

            console.log('Raw GraphQL result:', result);
            console.log('Artists array:', result.data.artists);
            
            const exhibitions = result.data.artists[0]?.exhibitedAtExhibitions || [];
            console.log('Extracted exhibitions:', exhibitions);
            console.log('Exhibition count:', exhibitions.length);
            
            // Log some sample exhibitions
            if (exhibitions.length > 0) {
                console.log('Sample exhibitions (first 3):');
                exhibitions.slice(0, 3).forEach((ex: any, idx: number) => {
                    console.log(`  ${idx + 1}. Title: "${ex.title}", Year: ${ex.startyear}, ID: ${ex.id}`);
                    console.log(`     Items: ${ex.exhibitsItems?.length || 0}`);
                });
            }
            
            setState(prev => ({
                ...prev,
                exhibitionsList: exhibitions
            }));

            console.log('=== EXHIBITION DATA FETCH COMPLETE ===');

        } catch (error) {
            console.error('Error fetching exhibition data:', error);
            loadCallback(false);
        }
    }, [artist.id, loadCallback]);

    // Generate network data after exhibitions are loaded
    useEffect(() => {
        if (state.exhibitionsList.length > 0 && artist.coExhibitedArtists) {
            console.log('=== GENERATING NETWORK DATA ===');
            console.log('Artist exhibitions loaded:', state.exhibitionsList.length);
            console.log('Co-exhibited artists available:', artist.coExhibitedArtists?.length || 0);
            console.log('Artists co-exhibited available:', artist.artistsCoExhibited?.length || 0);
            
            const links = generateNetworkData(artist);
            console.log('Generated links total:', links.length);
            
            // Print summary by target
            const targetSummary = new Map();
            links.forEach(link => {
                const targetId = link.targetId;
                const targetName = link.target?.name || 'Unknown';
                if (!targetSummary.has(targetId)) {
                    targetSummary.set(targetId, { name: targetName, count: 0 });
                }
                targetSummary.get(targetId).count++;
            });
            
            console.log('Unique targets:', targetSummary.size);
            console.log('Target summary (first 5):');
            let count = 0;
            targetSummary.forEach((summary, targetId) => {
                if (count < 5) {
                    console.log(`  ${summary.name} (ID: ${targetId}): ${summary.count} connections`);
                    count++;
                }
            });
            console.log('=== END GENERATION DEBUG ===');
            
            setState(prev => ({
                ...prev,
                links
            }));
        }
    }, [state.exhibitionsList, artist]);

    const drawTimeline = useCallback(() => {
        const { svg, baseTimeline, xScale, yScale, xAxis, yAxis } = d3ElementsRef.current;
        
        if (!svg || !baseTimeline || !xScale || !yScale || !xAxis || !yAxis) return;
        if (!timelineData.length) return;

        // Prepare data with missing years
        const dataWithMissingYears = createTimelineWithMissingYears(timelineData);
        
        // Update scale domains
        xScale.domain([YEAR_RANGE.min, YEAR_RANGE.max]);
        
        const yExtent = d3.extent(dataWithMissingYears, d => d.exhibitions);
        yScale.domain([0, yExtent[1] || 0]);

        // Create line generator
        const lineGenerator = d3.line<TimelineData>()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.year))
            .y(d => yScale(d.exhibitions));

        // Draw timeline path
        baseTimeline.selectAll('.base-path')
            .data([dataWithMissingYears])
            .join('path')
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('d', lineGenerator)
            .attr('stroke', 'black')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.75)
            .attr('fill', 'none');

        // Update axes
        const xAxisGenerator = d3.axisBottom(xScale).tickFormat(d3.format('d'));
        const yAxisGenerator = d3.axisLeft(yScale).tickFormat(d3.format('d')).ticks(5);

        xAxis.call(xAxisGenerator);
        yAxis.call(yAxisGenerator);

        // Add data points
        drawDataPoints(dataWithMissingYears);
    }, [timelineData]);

    const drawDataPoints = useCallback((data: TimelineData[]) => {
        const { baseTimeline, xScale, yScale, rScale } = d3ElementsRef.current;
        
        if (!baseTimeline || !xScale || !yScale || !rScale) return;

        // Update radius scale domain
        const itemExtent = d3.extent(data, d => d.items);
        rScale.domain(itemExtent as [number, number]);

        // Draw circles for each data point
        baseTimeline.selectAll('.data-point')
            .data(data.filter(d => d.exhibitions > 0))
            .join('circle')
            .attr('class', 'data-point')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.exhibitions))
            .attr('r', d => rScale(d.items))
            .attr('fill', 'rgba(0, 0, 0, 0.6)')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .on('mouseover', handleDataPointMouseOver)
            .on('mouseout', handleDataPointMouseOut);
    }, []);

    const handleDataPointMouseOver = useCallback((event: MouseEvent, d: TimelineData) => {
        const { tooltip } = d3ElementsRef.current;
        if (!tooltip) return;

        tooltip.style('opacity', 1)
            .html(`Year: ${d.year}<br/>Exhibitions: ${d.exhibitions}<br/>Items: ${d.items}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
    }, []);

    const handleDataPointMouseOut = useCallback(() => {
        const { tooltip } = d3ElementsRef.current;
        if (!tooltip) return;

        tooltip.style('opacity', 0);
    }, []);

    const fetchArtworkCounts = useCallback(async () => {
        // Implementation for fetching artwork counts
        try {
            // This would be replaced with actual GraphQL query
            const artworkCount = artist.createdItems?.length || 0;
            setState(prev => ({
                ...prev,
                baseNumberOfArtworks: artworkCount
            }));
        } catch (error) {
            console.error('Error fetching artwork counts:', error);
        }
    }, [artist]);

    const handleArtistChange = useCallback((artistId: number | null) => {
        if (artistId === null) {
            setState(prev => ({ ...prev, compareWith: null }));
            return;
        }

        // Implementation for handling artist comparison
        loadCallback(true);
        
        // This would involve fetching the comparison artist data
        // and updating the visualization accordingly
        
        setTimeout(() => {
            loadCallback(false);
        }, 100);
    }, [loadCallback]);

    const handleTimelineCallback = useCallback((year: number) => {
        // Implementation for timeline interaction callbacks
        console.log('Timeline callback for year:', year);
    }, []);

    const handleNetworkReady = useCallback(() => {
        showNetworkRef.current = true;
        setState(prev => ({ ...prev, rendered: true }));
    }, []);

    const handleColorSync = useCallback((colors: { group: string; colors: Map<string, string> }) => {
        setState(prev => ({ ...prev, colors }));
    }, []);

    // Visualization control handlers
    const handleCoExhibitionCountChange = useCallback((coExhibitionCount: number) => {
        setState(prev => ({ ...prev, coExhibitionCount }));
    }, []);

    const handleGroupByChange = useCallback((groupBy: string) => {
        setState(prev => ({ ...prev, groupBy }));
    }, []);

    const handleOrderByChange = useCallback((orderBy: string) => {
        setState(prev => ({ ...prev, orderBy }));
    }, []);

    const handleSearchChange = useCallback((searchTerm: string) => {
        setState(prev => ({ ...prev, searchTerm }));
        
        // Perform search logic here
        if (searchTerm.length >= 2) {
            // This would typically involve searching through a list of all artists
            // For now, we'll use a placeholder empty array
            setState(prev => ({ ...prev, searchResults: [] }));
        } else {
            setState(prev => ({ ...prev, searchResults: [] }));
        }
    }, []);

    const handleArtistSelect = useCallback((selectedArtist: Artist) => {
        // Handle artist selection - could navigate to different artist or add to comparison
        console.log('Selected artist:', selectedArtist);
        setState(prev => ({ 
            ...prev, 
            searchTerm: `${selectedArtist.firstname || ''} ${selectedArtist.lastname || ''}`.trim(),
            searchResults: []
        }));
    }, []);

    const handleNetworkModeChange = useCallback((networkMode: 'circles' | 'pies') => {
        setState(prev => ({ ...prev, networkMode }));
    }, []);

    return (
        <div className="artist-detail-container h-screen flex flex-col overflow-hidden">
            {/* Artist Detail Integrated Header */}
            <div className="flex-shrink-0">
                <ArtistDetailHeader
                    artist={artist}
                    coExhibitionCount={state.coExhibitionCount}
                    onCoExhibitionCountChange={handleCoExhibitionCountChange}
                    minCoExhibitions={1}
                    maxCoExhibitions={20}
                    groupBy={state.groupBy}
                    onGroupByChange={handleGroupByChange}
                    orderBy={state.orderBy}
                    onOrderByChange={handleOrderByChange}
                    searchTerm={state.searchTerm}
                    onSearchChange={handleSearchChange}
                    searchResults={state.searchResults}
                    onArtistSelect={handleArtistSelect}
                    networkMode={state.networkMode}
                    onNetworkModeChange={handleNetworkModeChange}
                    totalExhibitions={state.exhibitionsList.length}
                    totalLinks={state.links.length} // Total co-exhibition links
                    totalArtists={new Set(state.links.map(link => link.target.id)).size + 1} // Unique connected artists + base artist
                />
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {/* Desktop: 2x2 Grid Layout */}
                <div className="hidden lg:flex lg:flex-col lg:h-full lg:gap-1">
                    {/* Top Row: Timeline + Area Chart - 1/3 height */}
                    <div className="top-row grid grid-cols-2 gap-2 flex-shrink-0" style={{ flex: '0 0 35%' }}>
                        {/* Timeline Section - Top Left */}
                        <div className="timeline-section h-full">
                            <div id="timeline-container" className="w-full h-full">
                                <ArtistTimeline 
                                    artist={artist}
                                    exhibitionsList={state.exhibitionsList}
                                    compareArtist={state.compareWith}
                                    width={800}
                                    height={280}
                                    onYearHover={(year: number, exhibitions: any[]) => {
                                        handleTimelineCallback(year);
                                        // Could add more year-specific handling here
                                    }}
                                    className="w-full h-full"
                                />
                            </div>
                        </div>

                        {/* Area Chart Section - Top Right */}
                        <div className="area-chart-section h-full">
                            <div id="area-chart-container" className="w-full h-full">
                                <AreaChartComponent
                                    links={state.links}
                                    colors={state.colors}
                                    groupBy={state.colors.group}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Table + Network - 2/3 height */}
                    <div className="bottom-row grid grid-cols-2 gap-2 flex-1 min-h-0">
                        {/* Table Section - Bottom Left */}
                        <div className="table-section h-full overflow-hidden">
                            <TableComponent
                                baseId={Number(artist.id)}
                                compareWith={state.compareWith}
                                exhibitions={state.exhibitionsList}
                                query={GET_EXHIBITION}
                            />
                        </div>

                        {/* Network Section - Bottom Right */}
                        <div className="network-section h-full flex flex-col">
                            <div id="ego-net-container" className="flex-1 min-h-0">
                                {state.baseNode.id ? (
                                    <div className="h-full">
                                        <EgoNetworkComponent
                                            baseNode={state.baseNode}
                                            links={state.links}
                                            colors={state.colors}
                                            initCallBack={handleNetworkReady}
                                            requestNode={(node?: number) => handleArtistChange(node || null)}
                                            mouseOverCallBack={handleTimelineCallback}
                                            syncColors={() => handleColorSync(state.colors)}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        Loading network...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile: Linear Stacked Layout with Scroll */}
                <div className="lg:hidden flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 p-4">
                    {/* Timeline Section */}
                    <div className="timeline-section flex-shrink-0" style={{ height: '300px' }}>
                        <div id="timeline-container-mobile" className="w-full h-full">
                            <ArtistTimeline 
                                artist={artist}
                                exhibitionsList={state.exhibitionsList}
                                compareArtist={state.compareWith}
                                width={800}
                                height={280}
                                onYearHover={(year: number, exhibitions: any[]) => {
                                    handleTimelineCallback(year);
                                }}
                                className="w-full h-full"
                            />
                        </div>
                    </div>

                    {/* Area Chart Section */}
                    <div className="area-chart-section flex-shrink-0" style={{ height: '300px' }}>
                        <div id="area-chart-container-mobile" className="w-full h-full">
                            <AreaChartComponent
                                links={state.links}
                                colors={state.colors}
                                groupBy={state.colors.group}
                            />
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="table-section flex-shrink-0" style={{ height: '400px' }}>
                        <div className="h-full">
                            <TableComponent
                                baseId={Number(artist.id)}
                                compareWith={state.compareWith}
                                exhibitions={state.exhibitionsList}
                                query={GET_EXHIBITION}
                            />
                        </div>
                    </div>

                    {/* Network Section */}
                    <div className="network-section flex-shrink-0" style={{ height: '400px' }}>
                        <div id="ego-net-container-mobile" className="h-full">
                            {state.baseNode.id ? (
                                <div className="h-full">
                                    <EgoNetworkComponent
                                        baseNode={state.baseNode}
                                        links={state.links}
                                        colors={state.colors}
                                        initCallBack={handleNetworkReady}
                                        requestNode={(node?: number) => handleArtistChange(node || null)}
                                        mouseOverCallBack={handleTimelineCallback}
                                        syncColors={() => handleColorSync(state.colors)}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    Loading network...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArtistDetailComponent;
