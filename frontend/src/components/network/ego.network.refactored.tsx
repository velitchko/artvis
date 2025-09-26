import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import _ from 'lodash';
import * as d3 from 'd3';
import client from '../apollo/client';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/exhibitedWith';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import { Artist } from '../../models/artist.model';
import { countryColors, sexColors, ageGroupColors, livingColors } from '../../colors/colors';

// Types
interface EgoNetworkProps {
    baseNode: Node;
    links: Link[];
    colors?: { group: string; colors: Map<string, string> };
    width?: number;
    height?: number;
    coExhibitionCount?: number;
    groupBy?: string;
    orderBy?: string;
    selectedGroup?: string; // External group selection for highlighting
    initCallBack?: () => void;
    requestNode?: (node?: number) => void;
    mouseOverCallBack?: (year: number) => void;
    groupByCallBack?: () => void;
    arcClickCallback?: (group?: string) => void;
    filterCallback?: () => void;
    syncColors?: () => void;
}

interface EgoNetworkState {
    compareNode?: Node;
    coEx: number;
    groupBy: string;
    orderBy: string;
    selection: boolean;
    loading: boolean;
    colors: { group: string; colors: Map<string, string> };
    dimensions: { width: number; height: number };
}

interface D3Containers {
    svg?: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
    grid?: d3.Selection<any, any, any, any>;
    circle?: d3.Selection<any, any, any, any>;
    artist?: d3.Selection<any, any, any, any>;
    outerCircle?: d3.Selection<any, any, any, any>;
    donut?: d3.Selection<any, any, any, any>;
    tooltip?: d3.Selection<any, any, any, any>;
}

interface D3Scales {
    r: d3.ScalePower<number, number>;
    angle: d3.ScaleLinear<number, number>;
    nodeR: d3.ScalePower<number, number>;
    outerNodeR: d3.ScalePower<number, number>;
}

// Constants
const YEAR_RANGE = { min: 1905, max: 1915 };
const DEFAULT_CO_EX = 3;
const DEFAULT_GROUP_BY = 'country';

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

const useD3Scales = (): D3Scales => {
    return useMemo(() => ({
        r: d3.scaleSqrt(),
        angle: d3.scaleLinear(),
        nodeR: d3.scaleSqrt(),
        outerNodeR: d3.scaleSqrt()
    }), []);
};

// Color utility functions
const getColorMapping = (groupType: string, uniqueGroups?: string[]): Map<string, string> => {
    switch (groupType) {
        case 'sex':
            return sexColors;
        case 'living':
            return livingColors;
        case 'country':
            // Start with predefined country colors
            const countryColorMap = new Map(countryColors);
            
            // If we have unique groups, generate colors for missing countries
            if (uniqueGroups) {
                const predefinedCountries = new Set(countryColors.keys());
                const additionalCountries = uniqueGroups.filter(country => 
                    !predefinedCountries.has(country) && country !== 'Unknown'
                );
                
                if (additionalCountries.length > 0) {
                    // Use D3's category color scale for additional countries
                    const additionalColorScale = d3.scaleOrdinal(d3.schemeCategory10);
                    
                    additionalCountries.forEach((country, index) => {
                        countryColorMap.set(country, additionalColorScale(index.toString()));
                    });
                    
                    console.log('Added colors for additional countries:', additionalCountries);
                }
            }
            
            return countryColorMap;
        case 'ageGroup':
            // ageGroupColors is a function, will be populated dynamically based on unique groups
            const ageGroupMap = new Map<string, string>();
            if (uniqueGroups) {
                const sortedAgeGroups = [...uniqueGroups].sort((a: string, b: string) => {
                    if (a === 'unknown') return 1;
                    if (b === 'unknown') return -1;
                    if (a === 'same') return -1;
                    if (b === 'same') return 1;
                    if (a === 'similar') return -1;
                    if (b === 'similar') return 1;
                    return a.localeCompare(b);
                });
                
                sortedAgeGroups.forEach((ageGroup: string, index: number) => {
                    let color = '#333333'; // default
                    if (ageGroup === 'unknown') color = '#333333';
                    else if (ageGroup === 'similar') color = ageGroupColors(0.5);
                    else if (ageGroup === 'same') color = '#d3d3d3';
                    else color = ageGroupColors(index / Math.max(sortedAgeGroups.length, 1));
                    
                    ageGroupMap.set(ageGroup, color);
                });
            }
            return ageGroupMap;
        default:
            return new Map();
    }
};

// Utility function to position tooltips within viewport bounds
const getTooltipPosition = (mouseX: number, mouseY: number, tooltipWidth: number = 200, tooltipHeight: number = 100, offsetX: number = 15, offsetY: number = -15) => {
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Start with offset from cursor to avoid overlap
    let left = mouseX + offsetX;
    let top = mouseY + offsetY;
    
    // Check right boundary
    if (left + tooltipWidth > viewportWidth - padding) {
        left = mouseX - tooltipWidth - Math.abs(offsetX);
    }
    
    // Check left boundary
    if (left < padding) {
        left = padding;
    }
    
    // Check bottom boundary
    if (top + tooltipHeight > viewportHeight - padding) {
        top = mouseY - tooltipHeight - Math.abs(offsetY);
    }
    
    // Check top boundary
    if (top < padding) {
        top = padding;
    }
    
    return { left, top };
};

// Main component
const EgoNetworkComponent: React.FC<EgoNetworkProps> = ({
    baseNode,
    links,
    colors: initialColors,
    coExhibitionCount,
    groupBy: propGroupBy,
    orderBy: propOrderBy,
    selectedGroup: externalSelectedGroup,
    initCallBack,
    requestNode,
    mouseOverCallBack,
    groupByCallBack,
    arcClickCallback,
    filterCallback,
    syncColors
}) => {
    // Group links by target artist for analysis
    const linksByTarget = new Map();
    if (links && links.length > 0) {
        links.forEach(link => {
            const targetId = link.targetId;
            if (!linksByTarget.has(targetId)) {
                linksByTarget.set(targetId, []);
            }
            linksByTarget.get(targetId).push(link);
        });
    }

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const containersRef = useRef<D3Containers>({});
    const scalesRef = useRef<D3Scales>(useD3Scales());
    const linksRef = useRef<Link[]>([]);
    const isInitializedRef = useRef(false);
    const selectedGroupRef = useRef('');
    const isInternalSelectionRef = useRef(false);
    const thetaRef = useRef(0);

    // State
    const [state, setState] = useState<EgoNetworkState>({
        compareNode: undefined,
        coEx: coExhibitionCount ?? DEFAULT_CO_EX,
        groupBy: propGroupBy ?? DEFAULT_GROUP_BY,
        orderBy: propOrderBy ?? 'default',
        selection: false,
        loading: false,
        colors: initialColors || { group: propGroupBy ?? DEFAULT_GROUP_BY, colors: getColorMapping(propGroupBy ?? DEFAULT_GROUP_BY) },
        dimensions: { width: 0, height: 0 }
    });

    const [selectedGroup, setSelectedGroup] = useState<string>('');

    // Custom hooks
    const dimensions = useResizeObserver('ego-net-container');

    // Update dimensions when container size changes
    useEffect(() => {
        if (dimensions.width && dimensions.height) {
            setState(prev => ({
                ...prev,
                dimensions
            }));
        }
    }, [dimensions]);

    // Initialize color mapping
    useEffect(() => {
        const colors = getColorMapping(DEFAULT_GROUP_BY);
        setState(prev => ({
            ...prev,
            colors: { group: DEFAULT_GROUP_BY, colors }
        }));
    }, []);

    // Update state when props change (controlled by parent)
    useEffect(() => {
        setState(prev => ({
            ...prev,
            coEx: coExhibitionCount ?? prev.coEx,
            groupBy: propGroupBy ?? prev.groupBy,
            orderBy: propOrderBy ?? prev.orderBy,
            colors: initialColors || prev.colors
        }));
    }, [coExhibitionCount, propGroupBy, propOrderBy, initialColors]);

    // Track if we need to trigger a re-render due to prop changes
    const shouldReRender = useRef(false);
    
    // Set re-render flag when relevant props change
    useEffect(() => {
        if (isInitializedRef.current) {
            const coExChanged = coExhibitionCount !== undefined && coExhibitionCount !== state.coEx;
            const groupByChanged = propGroupBy !== undefined && propGroupBy !== state.groupBy;
            const orderByChanged = propOrderBy !== undefined && propOrderBy !== state.orderBy;
            
            if (coExChanged || groupByChanged || orderByChanged) {
                shouldReRender.current = true;
            }
        }
    }, [coExhibitionCount, propGroupBy, propOrderBy, state.coEx, state.groupBy, state.orderBy]);

    // Initialize D3 visualization when dimensions are available
    useEffect(() => {
        if (state.dimensions.width && state.dimensions.height && !isInitializedRef.current) {
            initializeVisualization();
            isInitializedRef.current = true;
            initCallBack?.();
        }
    }, [state.dimensions, initCallBack]);

    // Callbacks
    const handleZoom = useCallback((event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { svg } = containersRef.current;
        if (!svg) return;
        
        svg.select('#everything')
            .attr('transform', `translate(${event.transform.x}, ${event.transform.y}) scale(${event.transform.k})`);
    }, []);

    const handleRequestNode = useCallback((node?: number) => {
        requestNode?.(node);
    }, [requestNode]);

    const handleMouseOver = useCallback((year: number) => {
        mouseOverCallBack?.(year);
    }, [mouseOverCallBack]);

    const handleCoExChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newCoEx = parseInt(event.target.value);
        const newColors = getColorMapping(state.groupBy);
        
        setState(prev => ({
            ...prev,
            coEx: newCoEx,
            colors: { group: state.groupBy, colors: newColors }
        }));
        
        // Redraw with new data
        updateVisualization();
    }, [state.groupBy]);

    const handleGroupByChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const newGroupBy = event.target.value;
        const newColors = getColorMapping(newGroupBy);
        
        setState(prev => ({
            ...prev,
            groupBy: newGroupBy,
            colors: { group: newGroupBy, colors: newColors }
        }));
        
        // Redraw with new grouping
        updateVisualization();
    }, []);

    const handleOrderByChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setState(prev => ({
            ...prev,
            orderBy: event.target.value
        }));
        
        // Redraw with new ordering
        updateVisualization();
    }, []);

    // D3 Visualization functions
    const initializeVisualization = useCallback(() => {
        const { width, height } = state.dimensions;
        
        // Clear existing SVG
        d3.select('#ego-net').selectAll('*').remove();
        
        const svg = d3.select<SVGSVGElement, unknown>('#ego-net')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('pointer-events', 'all');

        // Setup zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.25, 10])
            .extent([[0, 0], [width, height]])
            .on('zoom', handleZoom);

        svg.call(zoom);

        // Create main container group
        const everything = svg.append('g').attr('id', 'everything');

        // Setup container groups
        const containers: D3Containers = {
            svg,
            grid: everything.append('g').attr('id', 'grid'),
            circle: everything.append('g').attr('id', 'circle-lines'),
            artist: everything.append('g').attr('id', 'artists'),
            donut: everything.append('g')
                .attr('id', 'donut')
                .attr('transform', `rotate(90) translate(${width / 2}, ${height / 2})`)
                .attr('transform-origin', 'center'),
            outerCircle: everything.append('g').attr('id', 'outer-circle-wrapper')
        };

        containersRef.current = containers;

        // Create base circle
        createBaseCircle(everything, width, height);

        // Setup scales
        setupScales();

        // Initialize data processing
        processAndRenderData();
    }, [state.dimensions, handleZoom]);

    // Helper function to get base node's group based on current groupBy setting
    const getBaseNodeGroup = useCallback(() => {
        const currentGroupBy = propGroupBy || state.groupBy;
        
        switch (currentGroupBy) {
            case 'ageGroup':
                // For base node, ageGroup is always 'same' (0 age difference with itself)
                return 'same';
            case 'sex':
                return baseNode.props.data.sex || 'unknown';
            case 'coex':
                // For co-exhibitions, we could use the number of connections
                // but for consistency with other nodes, let's use 'high' as default for base node
                return 'high';
            default:
                return baseNode.props.data.country || 'unknown';
        }
    }, [baseNode, propGroupBy, state.groupBy]);

    // Function to update base circle color when groupBy changes
    const updateBaseCircleColor = useCallback((currentColors?: Map<string, string>) => {
        const baseCircle = d3.select('#base-circle');
        if (!baseCircle.empty()) {
            const baseNodeGroup = getBaseNodeGroup();
            const colorsToUse = currentColors || state.colors.colors;
            const baseNodeColor = colorsToUse.get(baseNodeGroup) || 'black';
            
            baseCircle.attr('stroke', baseNodeColor);
        }
    }, [getBaseNodeGroup, state.colors]);

    const createBaseCircle = useCallback((container: d3.Selection<any, any, any, any>, width: number, height: number) => {
        const baseCircle = container.append('g').attr('id', 'base-circle-wrapper');
        const baseNodeGroup = getBaseNodeGroup();
        const baseNodeColor = state.colors.colors.get(baseNodeGroup) || 'black';

        baseCircle.append('circle')
            .attr('id', 'base-circle')
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            .attr('r', 40)
            .attr('stroke', baseNodeColor)
            .attr('stroke-width', 4)
            .attr('fill', 'transparent');

        // Add text labels
        const text = baseCircle.append('text').attr('id', 'base-circle-label');
        const nameParts = baseNode.name.split(' ');

        text.append('tspan')
            .attr('x', width / 2)
            .attr('y', height / 2 - 6)
            .attr('font-size', '12px')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('fill', 'black')
            .attr('font-weight', 'bold')
            .text(nameParts[0] || '');

        if (nameParts[1]) {
            text.append('tspan')
                .attr('x', width / 2)
                .attr('y', height / 2 + 6)
                .attr('font-size', '12px')
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('fill', 'black')
                .attr('font-weight', 'bold')
                .text(nameParts[1]);
        }
    }, [baseNode, state.colors, getBaseNodeGroup]);

    const setupScales = useCallback(() => {
        const scales = scalesRef.current;
        
        scales.r.domain([YEAR_RANGE.min, YEAR_RANGE.max])
            .range([100, 400]);

        scales.angle.range([0, 2 * Math.PI]);
        scales.nodeR.range([1, 6]);
        scales.outerNodeR.range([1, 6]);
    }, []);

    const processAndRenderData = useCallback(() => {
        const currentCoEx = coExhibitionCount ?? state.coEx;
        const { sortedLinks, updatedColors } = filterData(currentCoEx);
        
        linksRef.current = sortedLinks;
        const uniqueNodes = _.uniqBy(linksRef.current, (node: Link) => node.targetId);
        
        drawGridLines(uniqueNodes.length);
        drawCircles(updatedColors);
        drawDonutChart(updatedColors);
        updateBaseCircleColor(updatedColors);
    }, [coExhibitionCount, state.coEx, state.groupBy, state.orderBy, propGroupBy, propOrderBy, links, updateBaseCircleColor]);

    // Handle re-render when flag is set and processAndRenderData is available
    useEffect(() => {
        if (shouldReRender.current && isInitializedRef.current) {
            shouldReRender.current = false;
            processAndRenderData();
        }
    }, [state.coEx, state.groupBy, state.orderBy, processAndRenderData]);

    // Helper function for ordering links
    const orderByProperty = useCallback((prop: string, links: Link[]): Link[] => {
        switch (prop) {
            case 'default':
                return _.orderBy(links, ['target.name'], ['asc']);
            case 'alpha':
                return _.orderBy(links, ['target.name'], ['asc']);
            case 'coex':
                return _.orderBy(links, (link: Link) => {
                    // Sum all co-exhibitions for this target artist
                    const sum = links
                        .filter((l: Link) => l.targetId === link.targetId)
                        .reduce((acc, cur) => acc + cur.props.data.count, 0);
                    return sum;
                }, ['desc']);
            case 'age':
                return _.orderBy(links, ['target.props.age'], ['desc']);
            default:
                return _.orderBy(links, ['target.name'], ['asc']);
        }
    }, []);

    const filterData = useCallback((numCoEx: number): { sortedLinks: Link[], updatedColors: Map<string, string> } => {
        // Filter links based on co-exhibition threshold
        const filteredLinks = links.filter((link: Link) => {
            const sum = links
                .filter((l: Link) => l.targetId === link.targetId && link.target.props.data.country !== null)
                .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
            return sum >= numCoEx && (link.props.data.year >= YEAR_RANGE.min && link.props.data.year <= YEAR_RANGE.max);
        });

        // Group links by the specified property (e.g., country)
        const currentGroupBy = propGroupBy || state.groupBy;
        const groupedLinks = groupByProperty(currentGroupBy, filteredLinks);

        // Convert to array format and process each group
        const groupData: Array<{ group: string, links: Link[] }> = [];
        Object.entries(groupedLinks).forEach(([group, groupLinks]) => {
            // Set group property on each link
            groupLinks.forEach((link: Link) => {
                link.props.group = group;
                
                // Set additional properties (matching original logic)
                const birthYear = +link.target.props.data.birthyear;
                const deathYear = +link.target.props.data.deathyear;
                const baseBirthYear = +baseNode.props.data.birthyear;

                // Living status
                if (birthYear <= 1915 && (deathYear >= 1905 || isNaN(deathYear))) {
                    link.target.props.living = 'alive';
                } else if (deathYear < 1905 || birthYear > 1915) {
                    link.target.props.living = 'dead';
                } else {
                    link.target.props.living = '?';
                }

                // Basic properties
                link.target.props.country = link.target.props.data.country;
                link.target.props.sex = link.target.props.data.sex;
                
                // Age at death calculation
                const age = deathYear - birthYear;
                link.target.props.age = isNaN(age) ? 'unknown' : `${age}`;

                // Age group calculation (birth year difference from base artist)
                const ageDiff = birthYear - baseBirthYear;
                
                // Create age ranges (matching original logic)
                const ageRanges: string[] = [];
                for (let i = -50; i <= 50; i += 5) {
                    ageRanges.push(`${i}`);
                }
                
                // Find closest age range
                const ageGroup = ageRanges.reduce((closest: string | null, age: string) => {
                    if (closest === null) return age;

                    const diffToAge = Math.abs(ageDiff - parseInt(age));
                    const closestDiff = Math.abs(ageDiff - parseInt(closest));
                    if (diffToAge < closestDiff) {
                        return age;
                    }
                    return closest;
                }, null);

                if (!ageGroup || Math.abs(ageDiff) > 100) {
                    link.target.props.ageGroup = 'unknown';
                } else if (ageDiff === 0) {
                    link.target.props.ageGroup = 'same';
                } else if (Math.abs(ageDiff) <= 5) {
                    link.target.props.ageGroup = 'similar';
                } else {
                    const groupVal = +ageGroup;
                    link.target.props.ageGroup = `${groupVal > 0 ? 'gt_' + groupVal : 'lt_' + Math.abs(groupVal)}`;
                }
            });

            groupData.push({ group, links: groupLinks });
        });

        // Sort groups by size (largest to smallest) for better visual hierarchy
        const sortedGroupData = _.orderBy(groupData, ['links.length'], ['desc']);
        
        // Apply orderBy to each group and flatten - this matches original logic
        const currentOrderBy = propOrderBy || state.orderBy;
        const sortedLinks = sortedGroupData
            .map((groupItem) => {
                return orderByProperty(currentOrderBy, groupItem.links);
            })
            .flat();

        // Get unique target nodes from the sorted links (this determines the angular positions)
        const uniqueLinks = _.uniqBy(sortedLinks, (link: Link) => link.targetId);

        // CRITICAL: Assign originalIndex based on position in unique array FROM SORTED LINKS
        uniqueLinks.forEach((uniqueLink: Link, index: number) => {
            const targetId = uniqueLink.targetId;
            // Find all links with this targetId in the sorted array and set their originalIndex
            sortedLinks.forEach((link: Link) => {
                if (link.targetId === targetId) {
                    link.props.originalIndex = index;
                }
            });
        });
        
        // Update colors based on actual groups found
        const uniqueGroups = Array.from(new Set(sortedLinks.map(link => {
            if (currentGroupBy === 'ageGroup') {
                return link.target.props.ageGroup || 'unknown';
            }
            return link.props.group;
        })));
        
        const updatedColors = getColorMapping(currentGroupBy, uniqueGroups);
        setState(prev => ({
            ...prev,
            colors: { group: currentGroupBy, colors: updatedColors }
        }));

        // Update scales with the unique nodes
        updateScales(sortedLinks);

        return { sortedLinks, updatedColors };
    }, [links, propGroupBy, propOrderBy, state.groupBy, state.orderBy, baseNode, orderByProperty]);

    const groupByProperty = useCallback((prop: string, links: Link[]) => {
        return _.groupBy(links, (link: Link) => {
            switch (prop) {
                case 'country':
                    return link.target.props.data.country || 'Unknown';
                case 'year':
                    return link.props.data.year;
                case 'sex':
                    return link.target.props.data.sex || 'Unknown';
                case 'ageGroup':
                    return link.target.props.ageGroup || 'Unknown';
                case 'living':
                    return link.target.props.living || 'Unknown';
                default:
                    return 'Unknown';
            }
        });
    }, []);

    const processGroupData = useCallback((groupedLinks: _.Dictionary<Link[]>) => {
        return Object.entries(groupedLinks)
            .map(([group, groupLinks]) => ({
                group,
                links: groupLinks,
                count: groupLinks.length,
                percent: (groupLinks.length / links.length) * 100
            }))
            .sort((a, b) => b.percent - a.percent)
            .flatMap(item => item.links);
    }, [links]);

    const updateScales = useCallback((processedData: Link[]) => {
        const scales = scalesRef.current;
        const uniqueNodes = _.uniqBy(processedData, 'targetId');
        
        scales.angle.domain([0, uniqueNodes.length]);
        
        const counts = processedData.map(link => link.props.data.count);
        scales.nodeR.domain(d3.extent(counts) as [number, number]);
    }, []);

    const drawGridLines = useCallback((numTargets: number) => {
        const { grid, circle } = containersRef.current;
        const { width, height } = state.dimensions;
        const scales = scalesRef.current;
        
        if (!grid || !circle) return;

        // Helper functions
        const getAngle = (index: number): number => {
            return scales.angle(index);
        };

        const getXCoordinates = (date: number, angle: number, offset: number = 0): number => {
            return Math.cos(angle) * (scales.r(date) + offset);
        };

        const getYCoordinates = (date: number, angle: number, offset: number = 0): number => {
            return Math.sin(angle) * (scales.r(date) + offset);
        };

        // Draw radial grid lines - fade in after nodes are positioned
        const radialLines = grid.selectAll('.grid-line')
            .data(d3.range(0, numTargets))
            .join('line')
            .attr('class', 'grid-line')
            .attr('stroke', '#e3e3e3')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            // Set final positions immediately (no movement)
            .attr('x1', (d: any, i: number) => {
                return getXCoordinates(YEAR_RANGE.min, getAngle(i)) + width / 2;
            })
            .attr('x2', (d: any, i: number) => {
                return getXCoordinates(YEAR_RANGE.max, getAngle(i)) + width / 2;
            })
            .attr('y1', (d: any, i: number) => {
                return getYCoordinates(YEAR_RANGE.min, getAngle(i)) + height / 2;
            })
            .attr('y2', (d: any, i: number) => {
                return getYCoordinates(YEAR_RANGE.max, getAngle(i)) + height / 2;
            });

        // Fade in grid lines after nodes have moved (delayed start)
        radialLines
            .transition()
            .delay(350) // Wait for nodes to finish spreading
            .duration(300)
            .ease(d3.easeLinear)
            .attr('opacity', 1);

        // Draw circular grid lines for years - fade in after nodes
        const circularLines = circle.selectAll('.circle-line')
            .data(d3.range(YEAR_RANGE.min, YEAR_RANGE.max + 1))
            .join('circle')
            .attr('id', (d: any) => `circle-${d}`)
            .attr('class', 'circle-line')
            .attr('stroke', '#e3e3e3')
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .attr('opacity', 0)
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            // Set final radius immediately (no expansion animation)
            .attr('r', (d: any) => scales.r(d));

        // Fade in circular grid lines after nodes have moved
        circularLines
            .transition()
            .delay(350) // Wait for nodes to finish spreading
            .duration(300)
            .ease(d3.easeLinear)
            .attr('opacity', 1);
    }, [state.dimensions]);

    const drawCircles = useCallback((currentColors?: Map<string, string>) => {
        const { artist } = containersRef.current;
        const { width, height } = state.dimensions;
        const scales = scalesRef.current;
        
        if (!artist) return;

        // Use fresh colors if provided, otherwise fallback to state
        const colorsToUse = currentColors || state.colors.colors;

        // Helper functions
        const getAngle = (index: number): number => {
            return scales.angle(index);
        };

        const getXCoordinates = (date: number, angle: number, offset: number = 0): number => {
            return Math.cos(angle) * (scales.r(date) + offset);
        };

        const getYCoordinates = (date: number, angle: number, offset: number = 0): number => {
            return Math.sin(angle) * (scales.r(date) + offset);
        };

        const handleMouseOver = (event: PointerEvent) => {
            const id = (event.target as SVGCircleElement).id;
            const data = d3.select(`#${id}`).datum() as Link;

            if (!data) return;

            const x = event.clientX;
            const y = event.clientY;

            // Calculate smart tooltip position with extra offset to avoid cursor overlap
            const tooltipPos = getTooltipPosition(x, y, 180, 80, 20, -25);
            
            // Create tooltip
            const tooltip = d3.select('body').append('div')
                .style('position', 'absolute')
                .style('background-color', 'black')
                .style('color', 'white')
                .style('padding', '5px')
                .style('border-radius', '5px')
                .style('font-size', '12px')
                .style('left', `${tooltipPos.left}px`)
                .style('top', `${tooltipPos.top}px`)
                .style('z-index', '1000')
                .style('max-width', '180px')
                .html(`
                    <p><b>${data.target.name} (${data.props.data.year - data.target.props.data.birthyear})</b></p>
                    <p>Group: ${data.props.group}</p>
                    <p>(${data.props.data.year}) ${data.props.data.count} co-exhibitions</p>
                `);

            // Highlight connected links
            const connectedLinks = linksRef.current.filter((link: Link) => link.targetId === data.targetId);
            connectedLinks.forEach((link: Link) => {
                const circleId = `node-${link.target.id}-${link.props.data.year}`;
                const circle = d3.select(`#${circleId}`);
                if (!circle.empty()) {
                    circle.attr('stroke', 'black').attr('stroke-width', 2);
                }
            });
        };

        const handleMouseOut = (event: PointerEvent) => {
            // Remove all tooltips
            d3.selectAll('.label-tooltip, .outer-circle-tooltip, .arc-tooltip').remove();
            d3.selectAll('body > div').filter(function() {
                return d3.select(this).style('position') === 'absolute' && 
                       (d3.select(this).style('background-color') === 'black' || 
                        d3.select(this).style('background-color') === 'rgba(0, 0, 0, 0.9)');
            }).remove();

            // Reset circle styles
            artist.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', (d: any) => colorsToUse.get(d.props.group) || 'black')
                .attr('stroke-width', 2)
                .attr('fill', 'transparent');
        };

        // Calculate theta for positioning
        const uniqueLinks = _.uniqBy(linksRef.current, (node: Link) => node.targetId);
        thetaRef.current = 2 * Math.PI / uniqueLinks.length;

        // Draw artist circles with blooming flower animation
        const circles = artist.selectAll('circle')
            .data(linksRef.current)
            .join(
                enter => enter.append('circle')
                    .attr('id', (d: Link) => `node-${d.target.id}-${d.props.data.year}`)
                    // Start all nodes at center (base node position)
                    .attr('cx', width / 2)
                    .attr('cy', height / 2)
                    .attr('r', 0)
                    .attr('opacity', 0)
                    .attr('stroke', (d: Link) => colorsToUse.get(d.props.group) || 'black')
                    .attr('stroke-width', 2)
                    .attr('fill', 'transparent'),
                update => update
                    .attr('stroke', (d: Link) => colorsToUse.get(d.props.group) || 'black'),
                exit => exit.remove()
            );

        // Animate new nodes with hyperjump effect - all shoot out simultaneously
        circles.filter(function() { return d3.select(this).attr('r') === '0'; })
            .transition()
            .duration(300) // Balanced speed
            .ease(d3.easeCubicOut) // Sharp acceleration out from center
            .attr('r', (d: Link) => scales.nodeR(d.props.data.count))
            .attr('cx', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                const x = getXCoordinates(d.props.data.year, angle) + width / 2;
                d.target.x = x;
                return x;
            })
            .attr('cy', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                const y = getYCoordinates(d.props.data.year, angle) + height / 2;
                d.target.y = y;
                return y;
            })
            .attr('opacity', 0.75);

        // Update existing nodes with quick repositioning
        circles.filter(function() { return d3.select(this).attr('r') !== '0'; })
            .transition()
            .duration(200) // Faster updates
            .ease(d3.easeCubicInOut) // Smooth but quick
            .attr('r', (d: Link) => scales.nodeR(d.props.data.count))
            .attr('cx', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                const x = getXCoordinates(d.props.data.year, angle) + width / 2;
                d.target.x = x;
                return x;
            })
            .attr('cy', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                const y = getYCoordinates(d.props.data.year, angle) + height / 2;
                d.target.y = y;
                return y;
            })
            .attr('stroke', (d: Link) => colorsToUse.get(d.props.group) || 'black')
            .attr('opacity', 0.75);

        // Add event listeners
        circles
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)
            .on('click', (event: PointerEvent) => {
                // Set state.selection to true
                setState(prev => ({ ...prev, selection: true }));

                // Reset font weight of all labels
                artist.selectAll('.artist-label').attr('font-weight', 'normal');

                // ctrl+click to deselect
                if (event.ctrlKey) {
                    // Set state.selection to false
                    setState(prev => ({ ...prev, selection: false }));

                    // Unhighlight all nodes 
                    artist.selectAll('circle').attr('stroke', (d: any) => colorsToUse.get(d.props.group) || 'black');
                    artist.selectAll('circle').attr('stroke-width', 2);

                    // Reset all labels font weight to normal
                    artist.selectAll('.artist-label').attr('font-weight', 'normal');

                    // Reset opacity of all nodes
                    artist.selectAll('circle').attr('opacity', 0.75);

                    // Reset opacity of labels
                    artist.selectAll('.artist-label').attr('opacity', 1);

                    requestNode?.();
                    return;
                }

                const id = (event.target as SVGCircleElement).id;
                const data = d3.select(`#${id}`).datum() as Link;

                if (!data) return;

                requestNode?.(data.targetId);

                // Set current label font weight to bold
                const label = d3.select(`#artist-label-${data.target.id}`);
                if (label) label.attr('font-weight', 'bold').attr('opacity', 1);
            });

        // Draw cumulative count circles (outer circles)
        const { outerCircle } = containersRef.current;
        if (outerCircle) {
            // Calculate sums for each unique artist
            const sums = _.uniqBy(linksRef.current.map((link: Link) => {
                const sum = linksRef.current.filter((l: Link) => l.targetId === link.targetId)
                    .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
                return { targetId: link.targetId, sum: sum };
            }), (node: { targetId: number, sum: number }) => node.targetId);

            // Set outer node scale domain
            const sumValues = sums.map(node => node.sum);
            scales.outerNodeR.domain([Math.min(...sumValues), Math.max(...sumValues)]);

            // Draw outer circles
            outerCircle.selectAll('circle')
                .data(uniqueLinks)
                .join('circle')
                .attr('id', (d: Link) => `outer-circle-${d.target.id}`)
                .transition().duration(250)
                .attr('r', (d: Link) => {
                    // Sum up all counts of links with same targetId
                    const sum = linksRef.current.filter((link: Link) => link.targetId === d.targetId)
                        .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
                    return scales.outerNodeR(sum);
                })
                .attr('cx', (d: Link) => {
                    const angle = getAngle(d.props.originalIndex);
                    return getXCoordinates(YEAR_RANGE.max, angle, 40) + width / 2;
                })
                .attr('cy', (d: Link) => {
                    const angle = getAngle(d.props.originalIndex);
                    return getYCoordinates(YEAR_RANGE.max, angle, 40) + height / 2;
                })
                .attr('opacity', 0.75)
                .attr('fill', (d: Link) => colorsToUse.get(d.props.group) || 'black')
                .style('cursor', 'pointer');

            // Add outer circle event handlers
            outerCircle.selectAll('circle')
                .on('mouseover', (event: any, d: any) => {
                    if (!state.selection) {
                        // Highlight current outer circle
                        d3.select(`#outer-circle-${d.target.id}`)
                            .attr('stroke', 'black')
                            .attr('stroke-width', 2)
                            .attr('stroke-opacity', 1);

                        // Highlight all connected circles
                        const connectedLinks = linksRef.current.filter((link: Link) => link.targetId === d.targetId);
                        connectedLinks.forEach((link: Link) => {
                            const circleId = `node-${link.target.id}-${link.props.data.year}`;
                            d3.select(`#${circleId}`)
                                .attr('stroke', 'black')
                                .attr('stroke-width', 2);
                        });

                        // Create tooltip for cumulative count circle
                        const totalExhibitions = connectedLinks.reduce((acc, link) => acc + link.props.data.count, 0);
                        const totalYears = new Set(connectedLinks.map(link => link.props.data.year)).size;
                        const birthYear = d.target.props?.data?.birthyear || 'Unknown';
                        const country = d.target.props?.data?.country || 'Unknown';
                        
                        // Calculate smart tooltip position
                        const tooltipPos = getTooltipPosition(event.clientX, event.clientY, 220, 160, 15, -10);
                        
                        d3.select('body').append('div')
                            .attr('class', 'outer-circle-tooltip')
                            .style('position', 'absolute')
                            .style('background-color', 'rgba(0, 0, 0, 0.9)')
                            .style('color', 'white')
                            .style('padding', '10px')
                            .style('border-radius', '5px')
                            .style('font-size', '12px')
                            .style('left', `${tooltipPos.left}px`)
                            .style('top', `${tooltipPos.top}px`)
                            .style('z-index', '1000')
                            .style('pointer-events', 'none')
                            .style('box-shadow', '0 2px 5px rgba(0,0,0,0.3)')
                            .style('max-width', '220px')
                            .html(`
                                <div><strong>${d.target.name}</strong></div>
                                <div>Born: ${birthYear}</div>
                                <div>Country: ${country}</div>
                                <div>Group: ${d.props.group}</div>
                                <div><strong>Total co-exhibitions: ${totalExhibitions}</strong></div>
                                <div>Years active: ${totalYears}</div>
                                <div style="margin-top: 5px; font-size: 10px; opacity: 0.8;">Click to select artist</div>
                            `);
                    }
                })
                .on('mouseout', (event: any, d: any) => {
                    // Remove outer circle tooltip
                    d3.selectAll('.outer-circle-tooltip').remove();

                    if (!state.selection) {
                        // Reset outer circle styles
                        d3.select(`#outer-circle-${d.target.id}`)
                            .attr('stroke', 'none')
                            .attr('stroke-width', 0);

                        // Reset inner circle styles
                        artist.selectAll('circle')
                            .attr('stroke', (circleData: any) => colorsToUse.get(circleData.props.group) || 'black')
                            .attr('stroke-width', 2);
                    }
                })
                .on('click', (event: any, d: any) => {
                    // Remove any existing tooltips
                    d3.selectAll('.label-tooltip, .outer-circle-tooltip, .arc-tooltip').remove();
                    
                    // Set state.selection to true
                    setState(prev => ({ ...prev, selection: true }));

                    // ctrl+click to deselect
                    if (event.ctrlKey) {
                        setState(prev => ({ ...prev, selection: false }));

                        // Reset all styles
                        outerCircle.selectAll('circle').attr('stroke', 'none').attr('stroke-width', 0);
                        artist.selectAll('circle').attr('stroke', (circleData: any) => colorsToUse.get(circleData.props.group) || 'black').attr('stroke-width', 2);
                        artist.selectAll('circle').attr('opacity', 0.75);
                        artist.selectAll('.artist-label').attr('opacity', 1);

                        requestNode?.();
                        return;
                    }

                    console.log('Clicked outer circle:', d.target.name, 'ID:', d.targetId);

                    if (!d) return;

                    requestNode?.(d.targetId);
                });
        }

        // Draw artist labels
        const labelSelection = artist.selectAll('.artist-label')
            .data(uniqueLinks)
            .join('text')
            .attr('class', 'artist-label')
            .attr('id', (d: Link) => `artist-label-${d.target.id}`)
            .attr('x', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                // Increase offset to move labels further from arcs
                return getXCoordinates(YEAR_RANGE.max, angle, 80) + width / 2;
            })
            .attr('y', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                return getYCoordinates(YEAR_RANGE.max, angle, 80) + height / 2;
            })
            .attr('transform', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                const x2 = getXCoordinates(YEAR_RANGE.max, angle, 80) + width / 2;
                const y2 = getYCoordinates(YEAR_RANGE.max, angle, 80) + height / 2;

                // Convert angle to degrees for rotation
                let rotationAngleDegrees = (angle * 180) / Math.PI;

                // Adjust for readability - if text would be upside down, rotate it 180 degrees
                if (rotationAngleDegrees > 90 && rotationAngleDegrees < 270) {
                    rotationAngleDegrees += 180;
                }

                return `rotate(${rotationAngleDegrees}, ${x2}, ${y2})`;
            })
            .attr('text-anchor', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                let rotationAngleDegrees = (angle * 180) / Math.PI;
                
                // Normalize angle to 0-360
                if (rotationAngleDegrees < 0) rotationAngleDegrees += 360;
                
                // Determine text anchor based on angle
                if (rotationAngleDegrees > 90 && rotationAngleDegrees < 270) {
                    return 'end'; // Text flows from right to left when rotated
                } else {
                    return 'start'; // Text flows from left to right
                }
            })
            .attr('font-size', '11px')
            .attr('fill', 'black')
            .attr('dy', '0.35em')
            .text((d: Link) => {
                // Shorten long names for better readability
                const name = d.target.name;
                const parts = name.split(' ');
                if (parts.length > 2) {
                    return `${parts[0]} ${parts[1].charAt(0)}.`;
                } else if (parts.length === 2) {
                    return `${parts[0]} ${parts[1].charAt(0)}.`;
                }
                return name;
            })
            .style('cursor', 'pointer');

        // Add click and hover events to labels
        labelSelection
            .on('mouseover', (event: PointerEvent, d: Link) => {
                // Set state.selection to true
                setState(prev => ({ ...prev, selection: true }));

                // Reset font weight of all labels
                artist.selectAll('.artist-label').attr('font-weight', 'normal');

                // Make current label bold
                d3.select(`#artist-label-${d.target.id}`).attr('font-weight', 'bold');

                // Highlight current node
                const circles = artist.selectAll('circle').filter((circleData: any) => circleData.targetId === d.targetId);
                circles.attr('stroke', 'black').attr('stroke-width', 2).attr('stroke-opacity', 1);

                // Highlight all links with same targetId 
                const connectedLinks = linksRef.current.filter((link: Link) => link.targetId === d.targetId);
                connectedLinks.forEach((link: Link) => {
                    const circleId = `node-${link.target.id}-${link.props.data.year}`;
                    const circle = d3.select(`#${circleId}`);
                    if (!circle.empty()) {
                        circle.attr('stroke', 'black').attr('stroke-width', 2);
                    }
                });

                // Create tooltip for label
                const totalExhibitions = connectedLinks.reduce((acc, link) => acc + link.props.data.count, 0);
                const birthYear = d.target.props?.data?.birthyear || 'Unknown';
                const country = d.target.props?.data?.country || 'Unknown';
                
                // Calculate smart tooltip position
                const tooltipPos = getTooltipPosition(event.clientX, event.clientY, 200, 130, 15, -10);
                
                d3.select('body').append('div')
                    .attr('class', 'label-tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '8px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${tooltipPos.left}px`)
                    .style('top', `${tooltipPos.top}px`)
                    .style('z-index', '1000')
                    .style('pointer-events', 'none')
                    .style('max-width', '200px')
                    .html(`
                        <div><strong>${d.target.name}</strong></div>
                        <div>Born: ${birthYear}</div>
                        <div>Country: ${country}</div>
                        <div>Total co-exhibitions: ${totalExhibitions}</div>
                        <div>Group: ${d.props.group}</div>
                    `);
            })
            .on('mouseout', (event: PointerEvent, d: Link) => {
                // Remove label tooltip
                d3.selectAll('.label-tooltip').remove();

                // Reset styles only if no selection is active
                if (!state.selection) {
                    artist.selectAll('.artist-label').attr('font-weight', 'normal');
                    artist.selectAll('circle')
                        .attr('stroke', (circleData: any) => colorsToUse.get(circleData.props.group) || 'black')
                        .attr('stroke-width', 2)
                        .attr('stroke-opacity', 1);
                }
            })
            .on('click', (event: PointerEvent, d: Link) => {
                // Remove any existing tooltips
                d3.selectAll('.label-tooltip, .outer-circle-tooltip, .arc-tooltip').remove();
                
                // Set state.selection to true
                setState(prev => ({ ...prev, selection: true }));

                // Reset font weight of all labels
                artist.selectAll('.artist-label').attr('font-weight', 'normal');

                // ctrl+click to deselect
                if (event.ctrlKey) {
                    // Set state.selection to false
                    setState(prev => ({ ...prev, selection: false }));

                    // Unhighlight all nodes 
                    artist.selectAll('circle').attr('stroke', (circleData: any) => colorsToUse.get(circleData.props.group) || 'black');
                    artist.selectAll('circle').attr('stroke-width', 2);

                    // Reset all labels font weight to normal
                    artist.selectAll('.artist-label').attr('font-weight', 'normal');

                    // Reset opacity of all nodes
                    artist.selectAll('circle').attr('opacity', 0.75);

                    // Reset opacity of labels
                    artist.selectAll('.artist-label').attr('opacity', 1);

                    requestNode?.();
                    return;
                }

                console.log('Clicked artist:', d.target.name, 'ID:', d.targetId);

                if (!d) return;

                requestNode?.(d.targetId);

                // Set current label font weight to bold
                d3.select(`#artist-label-${d.target.id}`).attr('font-weight', 'bold').attr('opacity', 1);
            });
    }, [state.dimensions, state.colors]);

    const drawDonutChart = useCallback((currentColors?: Map<string, string>) => {
        const { donut } = containersRef.current;
        const { width, height } = state.dimensions;
        const scales = scalesRef.current;
        
        if (!donut || !linksRef.current.length) return;

        // Use fresh colors if provided, otherwise fallback to state
        const colorsToUse = currentColors || state.colors.colors;


        
        // Show which groups exist and their first/last positions
        const groupPositions = new Map();
        linksRef.current.forEach((link, index) => {
            if (!groupPositions.has(link.props.group)) {
                groupPositions.set(link.props.group, { first: index, last: index, firstOriginalIndex: link.props.originalIndex, lastOriginalIndex: link.props.originalIndex });
            } else {
                groupPositions.get(link.props.group).last = index;
                groupPositions.get(link.props.group).lastOriginalIndex = link.props.originalIndex;
            }
        });
        console.log('Group positions in array:', Array.from(groupPositions.entries()));
        
        // Get unique groups from current links
        const uniqueGroups = _.uniqBy(linksRef.current, (link: Link) => link.props.group);
        console.log('Unique groups for donut:', uniqueGroups.length);
        
        // Calculate theta (angle between nodes)
        const uniqueNodes = _.uniqBy(linksRef.current, 'targetId');
        const theta = 2 * Math.PI / uniqueNodes.length;
        
        // Calculate group ranges more simply
        const groupRanges = new Map();
        uniqueNodes.forEach((node) => {
            const group = node.props.group;
            const originalIndex = node.props.originalIndex;
            
            if (!groupRanges.has(group)) {
                groupRanges.set(group, {
                    minIndex: originalIndex,
                    maxIndex: originalIndex,
                    count: 1
                });
            } else {
                const range = groupRanges.get(group);
                range.minIndex = Math.min(range.minIndex, originalIndex);
                range.maxIndex = Math.max(range.maxIndex, originalIndex);
                range.count++;
            }
        });
        
        console.log('Group ranges:', Array.from(groupRanges.entries()));
        
        // Helper function to get angle
        const getAngle = (index: number): number => {
            return scales.angle(index);
        };
        
        // Create arc generator with simplified logic
        const arc = d3.arc<Link>()
            .innerRadius(scales.r(YEAR_RANGE.max) + 10)
            .outerRadius(scales.r(YEAR_RANGE.max) + 25)
            .startAngle((d: Link) => {
                const range = groupRanges.get(d.props.group);
                if (!range) return 0;
                
                // Start angle is the minimum index minus half theta for padding
                const startAngle = getAngle(range.minIndex) - theta / 2;
                return startAngle;
            })
            .endAngle((d: Link) => {
                const range = groupRanges.get(d.props.group);
                if (!range) return 0;
                
                // End angle is the maximum index plus half theta for padding
                const endAngle = getAngle(range.maxIndex) + theta / 2;
                return endAngle;
            });

        // Draw donut arcs
        donut.selectAll('path')
            .data(uniqueGroups)
            .join('path')
            .attr('class', 'donut')
            .attr('fill', (d: Link) => colorsToUse.get(d.props.group) || 'black')
            .attr('id', (d: Link) => `donut-${d.props.group}`)
            .attr('stroke', 'none')
            .attr('stroke-width', 1)
            .attr('d', (d: Link) => {
                const arcPath = arc(d);
                console.log(`Arc for ${d.props.group}:`, arcPath);
                return arcPath;
            })
            .style('cursor', 'pointer')
            .on('mouseover', (event: MouseEvent, d: Link) => {
                const groupCount = linksRef.current.filter(link => link.props.group === d.props.group).length;
                const percentage = (groupCount / linksRef.current.length) * 100;
                
                // Remove any existing arc tooltip
                d3.selectAll('.arc-tooltip').remove();
                
                // Calculate smart tooltip position
                const tooltipPos = getTooltipPosition(event.clientX, event.clientY, 200, 120, 15, -10);
                
                // Create improved tooltip
                d3.select('body').append('div')
                    .attr('class', 'arc-tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'rgba(0, 0, 0, 0.9)')
                    .style('color', 'white')
                    .style('padding', '10px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${tooltipPos.left}px`)
                    .style('top', `${tooltipPos.top}px`)
                    .style('z-index', '1000')
                    .style('pointer-events', 'none')
                    .style('box-shadow', '0 2px 5px rgba(0,0,0,0.3)')
                    .style('max-width', '200px')
                    .html(`
                        <div><strong>${d.props.group}</strong></div>
                        <div>Artists: ${groupCount}</div>
                        <div>Percentage: ${percentage.toFixed(1)}%</div>
                        <div style="margin-top: 5px; font-size: 10px; opacity: 0.8;">Click to filter by group</div>
                    `);

                console.log(`${d.props.group}: ${percentage.toFixed(1)}%`);
            })
            .on('mouseout', (event: MouseEvent, d: Link) => {
                // Remove arc tooltip
                d3.selectAll('.arc-tooltip').remove();
            })
            .on('click', (event: MouseEvent, d: Link) => {
                // Remove any existing tooltips
                d3.selectAll('.arc-tooltip, .label-tooltip, .outer-circle-tooltip').remove();
                
                console.log('Clicked arc with group:', d.props.group);
                console.log('Arc ID:', `donut-${d.props.group}`);
                
                // Get the current arc that was clicked
                const clickedArcId = `donut-${d.props.group}`;
                const currentlySelected = donut.select(`#${clickedArcId}`).attr('data-selected');
                const { artist, outerCircle } = containersRef.current;
                const prop = state.groupBy;
                
                if (currentlySelected === 'true') {
                    // Reset all arcs and dots to full opacity
                    console.log('Deselecting arc:', clickedArcId);
                    donut.selectAll('path')
                        .attr('opacity', 1)
                        .attr('data-selected', 'false');
                    
                    // Reset all artist dots to full opacity
                    if (artist) {
                        const allCircles = artist.selectAll('circle');
                        const allOuterCircles = outerCircle?.selectAll('circle');
                        const allLabels = artist.selectAll('.artist-label');
                        

                        
                        allCircles.attr('opacity', 0.75);
                        allOuterCircles?.attr('opacity', 0.75);
                        allLabels.attr('opacity', 1);
                    }
                    
                    selectedGroupRef.current = '';
                } else {
                    // Set all arcs to reduced opacity first
                    console.log('Selecting arc:', clickedArcId, 'for group:', d.props.group);
                    donut.selectAll('path')
                        .attr('opacity', 0.25)
                        .attr('data-selected', 'false');
                    
                    // Set clicked arc to full opacity
                    donut.select(`#${clickedArcId}`)
                        .attr('opacity', 1)
                        .attr('data-selected', 'true');
                    
                    // Highlight dots belonging to this group
                    if (artist) {
                        const allCircles = artist.selectAll('circle');
                        const allOuterCircles = outerCircle?.selectAll('circle');
                        const allLabels = artist.selectAll('.artist-label');
                        
                        // Set all dots to reduced opacity first
                        allCircles.attr('opacity', 0.25);
                        allOuterCircles?.attr('opacity', 0.25);
                        allLabels.attr('opacity', 0.25);
                        
                        // Highlight dots matching the selected group
                        const matchingCircles = allCircles.filter((dotData: any) => {
                            return dotData?.target?.props?.[prop] === d.props.group;
                        });
                        
                        const matchingOuterCircles = allOuterCircles?.filter((dotData: any) => {
                            return dotData?.target?.props?.[prop] === d.props.group;
                        });
                        
                        const matchingLabels = allLabels.filter((dotData: any) => {
                            return dotData?.target?.props?.[prop] === d.props.group;
                        });
                        
                        matchingCircles.attr('opacity', 1);
                        matchingOuterCircles?.attr('opacity', 1);
                        matchingLabels.attr('opacity', 1);
                    }
                    
                    selectedGroupRef.current = d.props.group;
                }
                
                // Notify parent component if needed
                arcClickCallback?.(selectedGroupRef.current);
            });

        // Draw group labels positioned on arc centroids (like original)
        donut.selectAll('.donut-label')
            .data(uniqueGroups)
            .join('text')
            .attr('class', 'donut-label')
            .attr('id', (d: Link) => `donut-label-${d.props.group}`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('dy', '0.35em')
            .attr('fill', 'black')
            .attr('x', (d: Link) => arc.centroid(d)[0])
            .attr('y', (d: Link) => arc.centroid(d)[1])
            .attr('transform', (d: Link) => {
                const x2 = arc.centroid(d)[0];
                const y2 = arc.centroid(d)[1];
                return `rotate(-90, ${x2}, ${y2})`;
            })
            .text((d: Link) => {
                // Format text based on group type
                if (state.groupBy === 'ageGroup') {
                    if (d.props.group.includes('gt')) {
                        return `~${d.props.group.split('_')[1]} years older`;
                    }
                    if (d.props.group.includes('lt')) {
                        return `~${d.props.group.split('_')[1]} years younger`;
                    }
                    return d.props.group;
                }
                return d.props.group;
            })
            .style('cursor', 'pointer')
            .style('pointer-events', 'none'); // Prevent interfering with arc clicks
            
        console.log('Donut chart drawn with', uniqueGroups.length, 'arcs');
    }, [state.dimensions, state.colors, arcClickCallback]);

    const updateVisualization = useCallback(() => {
        console.log('=== UPDATE VISUALIZATION CALLED ===');
        console.log('Is initialized:', isInitializedRef.current);
        
        if (isInitializedRef.current) {
            console.log('Calling processAndRenderData...');
            processAndRenderData();
        } else {
            console.log('Skipping processAndRenderData - not initialized');
        }
    }, [processAndRenderData]);

    // Update visualization when links change - only run once for initialization
    const hasRenderedRef = useRef(false);
    
    useEffect(() => {
        if (links && links.length > 0 && isInitializedRef.current && !hasRenderedRef.current) {
            console.log('Initial rendering of network with', links.length, 'links');
            updateVisualization();
            hasRenderedRef.current = true;
        }
    }, [links, updateVisualization]);

    // Public methods for external control
    const highlightCircle = useCallback((year: number) => {
        const { circle } = containersRef.current;
        if (!circle) return;

        if (year === 0) {
            circle.selectAll('circle')
                .attr('stroke', '#e3e3e3')
                .attr('fill', 'none')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', 0);
        } else {
            circle.select(`#circle-${year}`)
                .attr('stroke', 'orange')
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', 5)
                .raise();
        }
    }, []);

    const highlightGroup = useCallback((group: string) => {
        const { artist, outerCircle, donut } = containersRef.current;
        selectedGroupRef.current = group;
        
        if (!artist) return;

        if (group === '') {
            // Reset all elements to default state
            artist.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .attr('stroke-width', 2);

            outerCircle?.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .attr('stroke-width', 1);

            donut?.selectAll('path')
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .attr('stroke', '#333')
                .attr('stroke-width', 1);

            artist.selectAll('.artist-label')
                .attr('opacity', 1)
                .attr('font-weight', 'normal');
        } else {
            const prop = state.groupBy;

            // Dim all elements first (more faded than before)
            artist.selectAll('circle')
                .attr('opacity', 0.2)
                .attr('stroke-opacity', 0.3)
                .attr('fill-opacity', 0.2)
                .attr('stroke-width', 1);

            outerCircle?.selectAll('circle')
                .attr('opacity', 0.2)
                .attr('stroke-opacity', 0.3)
                .attr('fill-opacity', 0.2)
                .attr('stroke-width', 1);

            donut?.selectAll('path')
                .attr('opacity', 0.3)
                .attr('stroke-opacity', 0.3)
                .attr('fill-opacity', 0.3)
                .attr('stroke', '#333')
                .attr('stroke-width', 1);

            artist.selectAll('.artist-label')
                .attr('opacity', 0.15)
                .attr('font-weight', 'normal');

            // Highlight elements matching the group with full visibility and enhanced styling
            artist.selectAll('circle')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .attr('stroke-width', 3)
                .raise();

            artist.selectAll('.artist-label')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .attr('font-weight', 'bold')
                .raise();

            outerCircle?.selectAll('circle')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .attr('stroke-width', 2)
                .raise();

            // Highlight the selected arc with enhanced styling
            const selectedArc = donut?.select(`#donut-${group}`);
            if (selectedArc && !selectedArc.empty()) {
                selectedArc
                    .attr('opacity', 1)
                    .attr('stroke-opacity', 1)
                    .attr('fill-opacity', 1)
                    .attr('stroke', '#000')
                    .attr('stroke-width', 3)
                    .raise();
            }
        }
    }, [state.groupBy]);

    const highlightArtist = useCallback((artist: Artist | null) => {
        const { artist: artistContainer, outerCircle } = containersRef.current;
        if (!artistContainer) return;

        // Check if artist is in the ego network
        const uniqueLinks = _.uniqBy(linksRef.current, (l: Link) => l.target.id);
        const found = uniqueLinks.some((link: Link) => link.target.id === artist?.id);

        artistContainer.selectAll('.artist-label')
            .attr('opacity', 1)
            .attr('font-weight', 'normal');

        if (!found || !artist) {
            // Reset all circles to default state
            artistContainer.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', (d: any) => state.colors.colors.get(d.props.group) || 'black')
                .attr('stroke-width', 2)
                .attr('fill', 'transparent');

            outerCircle?.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', 'none')
                .attr('stroke-width', 0);

            artistContainer.selectAll('.artist-label')
                .attr('opacity', 1)
                .attr('font-weight', 'normal');

            return;
        }

        // Highlight the selected artist
        const label = artistContainer.select(`#artist-label-${artist.id}`);
        if (!label.empty()) {
            label.attr('font-weight', 'bold').attr('opacity', 1);
        }
    }, [state.colors]);

    const drawSecondaryLinks = useCallback((id: string | number, links: Link[]) => {
        const { artist, outerCircle } = containersRef.current;
        if (!state.compareNode || !artist) return;

        // Check if ID is number if not parse as number
        if (typeof id === 'string') {
            id = parseInt(id);
        }

        // Select all artist and outer circles and reduce the opacity to 0.25
        artist.selectAll('circle')
            .attr('opacity', 0.25)
            .attr('stroke', (d: any) => state.colors.colors.get(d.props.group) || 'black');

        artist.selectAll('circle')
            .filter((d: any) => d.target.id == id)
            .attr('opacity', 1)
            .attr('stroke', 'black');

        outerCircle?.selectAll('circle').attr('opacity', 0.25);

        // Highlight all links from the links array 
        links.forEach((link: Link) => {
            const linkId = `outer-circle-${link.target.id}`;
            const outer = outerCircle?.select(`#${linkId}`);

            if (!outer) return;

            outer
                .attr('opacity', 1)
                .attr('stroke', 'black')
                .attr('stroke-width', 2)
                .attr('stroke-opacity', 1);
        });

        // Select all artist circles containing a link from the links array and set opacity to 1
        const circles = artist.selectAll('circle')
            .filter((d: any) => {
                return links.find((link: Link) => link.target.id == d.target.id) ? true : false;
            });

        circles.attr('opacity', 1);

        // Highlight baseNode artist and outer circle
        const baseOuter = outerCircle?.select(`#outer-circle-${state.compareNode.id}`);

        if (baseOuter) {
            baseOuter
                .attr('opacity', 1)
                .attr('stroke', 'black')
                .attr('stroke-width', 2)
                .attr('stroke-opacity', 1);
        }

        const baseCircle = artist.selectAll('circle')
            .filter((d: any) => d.target.id == state.compareNode?.id);

        baseCircle.attr('opacity', 1).attr('stroke', 'black');
    }, [state.compareNode, state.colors]);

    // Additional utility functions for complete functionality
    const getSecondaryLinks = useCallback(async (artistId: string | number): Promise<Link[]> => {
        // This would typically make an API call to get secondary links
        // For now, return empty array as placeholder
        return [];
    }, []);

    // Enhanced highlight artist with secondary links support
    const highlightArtistWithSecondary = useCallback((artist: Artist | null) => {
        const { artist: artistContainer, outerCircle } = containersRef.current;
        if (!artistContainer) return;

        // Check if artist is in the ego network
        const uniqueLinks = _.uniqBy(linksRef.current, (l: Link) => l.target.id);
        const found = uniqueLinks.some((link: Link) => link.target.id === artist?.id);

        artistContainer.selectAll('.artist-label')
            .attr('opacity', 1)
            .attr('font-weight', 'normal');

        if (!found || !artist) {
            // Reset all circles to default state
            artistContainer.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', (d: any) => state.colors.colors.get(d.props.group) || 'black')
                .attr('stroke-width', 2)
                .attr('fill', 'transparent');

            outerCircle?.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', 'none')
                .attr('stroke-width', 0);

            artistContainer.selectAll('.artist-label')
                .attr('opacity', 1)
                .attr('font-weight', 'normal');

            return;
        }

        // Highlight the selected artist
        const label = artistContainer.select(`#artist-label-${artist.id}`);
        if (!label.empty()) {
            label.attr('font-weight', 'bold').attr('opacity', 1);
        }

        // Get and draw secondary links if available
        getSecondaryLinks(artist.id).then(links => {
            if (links.length > 0) {
                drawSecondaryLinks(artist.id, links);
            }
        });
    }, [state.colors, getSecondaryLinks, drawSecondaryLinks]);

    // Handle external group selection for highlighting
    useEffect(() => {
        if (externalSelectedGroup !== undefined && 
            externalSelectedGroup !== selectedGroupRef.current && 
            !isInternalSelectionRef.current) {
            console.log('Ego network received external group selection:', externalSelectedGroup, 'current:', selectedGroupRef.current);
            setSelectedGroup(externalSelectedGroup);
            highlightGroup(externalSelectedGroup);
        }
    }, [externalSelectedGroup, highlightGroup]);

    // Public API methods
    const publicAPI = useMemo(() => ({
        highlightCircle,
        highlightGroup,
        highlightArtist: highlightArtistWithSecondary,
        drawSecondaryLinks,
        getSecondaryLinks
    }), [highlightCircle, highlightGroup, highlightArtistWithSecondary, drawSecondaryLinks, getSecondaryLinks]);

    // Render
    return (
        <div ref={containerRef} id="ego-net-container" className="w-full h-full">
            <svg id="ego-net" className="w-full h-full" />
        </div>
    );
};

export default EgoNetworkComponent;
