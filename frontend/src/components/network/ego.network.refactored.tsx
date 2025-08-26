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
    initCallBack?: () => void;
    requestNode?: (node?: number) => void;
    mouseOverCallBack?: (year: number) => void;
    groupByCallBack?: () => void;
    arcClickCallback?: () => void;
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
            // ageGroupColors is a function, need to handle differently
            return new Map(); // Will be populated dynamically
        default:
            return new Map();
    }
};

// Main component
const EgoNetworkComponent: React.FC<EgoNetworkProps> = ({
    baseNode,
    links,
    colors: initialColors,
    initCallBack,
    requestNode,
    mouseOverCallBack,
    groupByCallBack,
    arcClickCallback,
    filterCallback,
    syncColors
}) => {
    // Debug logging
    console.log('EgoNetworkComponent received props:', {
        baseNode: baseNode?.name || 'none',
        linksCount: links?.length || 0,
        colors: initialColors?.group || 'none'
    });

    // Debug links structure
    if (links && links.length > 0) {
        console.log('=== CO-EXHIBITOR LINKS DEBUG ===');
        console.log('Source (Ego):', baseNode?.name);
        console.log('Total links:', links.length);
        
        // Group links by target artist
        const linksByTarget = new Map();
        links.forEach(link => {
            const targetId = link.targetId;
            if (!linksByTarget.has(targetId)) {
                linksByTarget.set(targetId, []);
            }
            linksByTarget.get(targetId).push(link);
        });

        console.log('Unique co-exhibitors:', linksByTarget.size);
        
        // Print first 5 co-exhibitors with their connection details
        let count = 0;
        linksByTarget.forEach((targetLinks, targetId) => {
            if (count < 5) {
                const firstLink = targetLinks[0];
                console.log(`\nCo-exhibitor ${count + 1}:`);
                console.log('  Target ID:', targetId);
                console.log('  Target Name:', firstLink.target?.name || 'Unknown');
                console.log('  Target Country:', firstLink.target?.props?.data?.country || 'Unknown');
                console.log('  Target Sex:', firstLink.target?.props?.data?.sex || 'Unknown');
                console.log('  Connections:', targetLinks.length);
                
                // Show first few exhibition years
                const years = targetLinks.map((l: Link) => l.props?.data?.year).slice(0, 3);
                console.log('  Exhibition years (first 3):', years);
                
                // Show connection counts
                const counts = targetLinks.map((l: Link) => l.props?.data?.count).slice(0, 3);
                console.log('  Connection counts:', counts);
                
                count++;
            }
        });
        
        console.log('\n=== END LINKS DEBUG ===');
    }

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const containersRef = useRef<D3Containers>({});
    const scalesRef = useRef<D3Scales>(useD3Scales());
    const linksRef = useRef<Link[]>([]);
    const isInitializedRef = useRef(false);
    const selectedGroupRef = useRef('');
    const thetaRef = useRef(0);

    // State
    const [state, setState] = useState<EgoNetworkState>({
        compareNode: undefined,
        coEx: DEFAULT_CO_EX,
        groupBy: DEFAULT_GROUP_BY,
        orderBy: 'default',
        selection: false,
        loading: false,
        colors: initialColors || { group: DEFAULT_GROUP_BY, colors: getColorMapping(DEFAULT_GROUP_BY) },
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

    const createBaseCircle = useCallback((container: d3.Selection<any, any, any, any>, width: number, height: number) => {
        const baseCircle = container.append('g').attr('id', 'base-circle-wrapper');

        baseCircle.append('circle')
            .attr('id', 'base-circle')
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            .attr('r', 40)
            .attr('stroke', state.colors.colors.get(baseNode.props.data.country) || 'black')
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
    }, [baseNode, state.colors]);

    const setupScales = useCallback(() => {
        const scales = scalesRef.current;
        
        scales.r.domain([YEAR_RANGE.min, YEAR_RANGE.max])
            .range([100, 400]);

        scales.angle.range([0, 2 * Math.PI]);
        scales.nodeR.range([1, 6]);
        scales.outerNodeR.range([1, 6]);
    }, []);

    const processAndRenderData = useCallback(() => {
        console.log('=== PROCESS AND RENDER DATA CALLED ===');
        console.log('Input links prop:', links?.length || 0);
        console.log('State coEx threshold:', state.coEx);
        
        const targetNodes = filterData(state.coEx);
        console.log('Filtered target nodes:', targetNodes?.length || 0);
        
        linksRef.current = targetNodes;
        console.log('Updated linksRef.current to:', linksRef.current?.length || 0);

        const uniqueNodes = _.uniqBy(linksRef.current, (node: Link) => node.targetId);
        console.log('Unique nodes for rendering:', uniqueNodes?.length || 0);
        
        drawGridLines(uniqueNodes.length);
        drawCircles();
        drawDonutChart();
    }, [state.coEx, links]);

    const filterData = useCallback((numCoEx: number): Link[] => {
        console.log('=== FILTER DATA START ===');
        console.log('Input links:', links?.length || 0);
        console.log('numCoEx threshold:', numCoEx);
        
        // Filter links based on co-exhibition threshold
        const filteredLinks = links.filter((link: Link) => {
            const sum = links
                .filter((l: Link) => l.targetId === link.targetId && link.target.props.data.country !== null)
                .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
            return sum >= numCoEx && (link.props.data.year >= YEAR_RANGE.min && link.props.data.year <= YEAR_RANGE.max);
        });

        console.log('Filtered links:', filteredLinks.length);

        // Group links by the specified property (e.g., country)
        const groupedLinks = groupByProperty(state.groupBy, filteredLinks);
        console.log('Grouped by', state.groupBy, ':', Object.keys(groupedLinks).length, 'groups');

        // Convert to array format and process each group
        const groupData: Array<{ group: string, links: Link[] }> = [];
        Object.entries(groupedLinks).forEach(([group, groupLinks]) => {
            // Set group property on each link
            groupLinks.forEach((link: Link) => {
                link.props.group = group;
                
                // Set additional properties (simplified version of original logic)
                const birthYear = +link.target.props.data.birthyear;
                const deathYear = +link.target.props.data.deathyear;

                if (birthYear <= 1915 && (deathYear >= 1905 || isNaN(deathYear))) {
                    link.target.props.living = 'alive';
                } else if (deathYear < 1905 || birthYear > 1915) {
                    link.target.props.living = 'dead';
                } else {
                    link.target.props.living = '?';
                }

                link.target.props.country = link.target.props.data.country;
                link.target.props.sex = link.target.props.data.sex;
            });

            groupData.push({ group, links: groupLinks });
        });

        // CRITICAL: Sort groups to ensure consistent ordering
        const sortedGroupData = _.orderBy(groupData, ['group'], ['asc']);
        
        // CRITICAL: Flatten with groups staying together - this is key for arc calculations
        const sortedLinks: Link[] = [];
        sortedGroupData.forEach(groupItem => {
            const groupLinksOrdered = _.orderBy(groupItem.links, ['props.data.year'], ['asc']);
            sortedLinks.push(...groupLinksOrdered);
        });

        console.log('Sorted links by group:', sortedLinks.length);
        console.log('Group order:', sortedGroupData.map(g => g.group));

        // Get unique target nodes from the sorted links (this determines the angular positions)
        const uniqueLinks = _.uniqBy(sortedLinks, (link: Link) => link.targetId);
        console.log('Unique target nodes:', uniqueLinks.length);

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

        console.log('Assigned originalIndex to all links');
        
        // Update colors based on actual groups found
        if (state.groupBy === 'country') {
            const uniqueCountries = Array.from(new Set(sortedLinks.map(link => link.props.group)));
            console.log('Unique countries found:', uniqueCountries);
            
            const updatedColors = getColorMapping('country', uniqueCountries);
            setState(prev => ({
                ...prev,
                colors: { group: 'country', colors: updatedColors }
            }));
        }
        
        // Debug originalIndex assignment
        const indexCheck = uniqueLinks.map(link => ({
            targetId: link.targetId,
            name: link.target.name,
            originalIndex: link.props.originalIndex,
            group: link.props.group
        }));
        console.log('OriginalIndex assignment:', indexCheck.slice(0, 10));

        // Update scales with the unique nodes
        updateScales(sortedLinks);

        return sortedLinks;
    }, [links, state.groupBy]);

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

    const calculateAgeGroup = useCallback((targetBirthYear: number, baseBirthYear: number): string => {
        const ageDiff = targetBirthYear - baseBirthYear;
        const groupSize = 5;
        const groupIndex = Math.floor(ageDiff / groupSize) * groupSize;
        return `${groupIndex >= 0 ? '+' : ''}${groupIndex}`;
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

        // Draw radial grid lines
        grid.selectAll('.grid-line')
            .data(d3.range(0, numTargets))
            .join('line')
            .attr('class', 'grid-line')
            .attr('stroke', '#e3e3e3')
            .attr('stroke-width', 1)
            .transition().duration(250)
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

        // Draw circular grid lines for years
        circle.selectAll('.circle-line')
            .data(d3.range(YEAR_RANGE.min, YEAR_RANGE.max + 1))
            .join('circle')
            .attr('id', (d: any) => `circle-${d}`)
            .attr('class', 'circle-line')
            .attr('stroke', '#e3e3e3')
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .transition().duration(250)
            .attr('cx', width / 2)
            .attr('cy', height / 2)
            .attr('r', (d: any) => scales.r(d));
    }, [state.dimensions]);

    const drawCircles = useCallback(() => {
        const { artist } = containersRef.current;
        const { width, height } = state.dimensions;
        const scales = scalesRef.current;
        
        if (!artist) return;

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

            // Create tooltip
            const tooltip = d3.select('body').append('div')
                .style('position', 'absolute')
                .style('background-color', 'black')
                .style('color', 'white')
                .style('padding', '5px')
                .style('border-radius', '5px')
                .style('font-size', '12px')
                .style('left', `${x}px`)
                .style('top', `${y}px`)
                .style('z-index', '1000')
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
            d3.selectAll('.label-tooltip, .outer-circle-tooltip').remove();
            d3.selectAll('body > div').filter(function() {
                return d3.select(this).style('position') === 'absolute' && 
                       d3.select(this).style('background-color') === 'black';
            }).remove();

            // Reset circle styles
            artist.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', (d: any) => state.colors.colors.get(d.props.group) || 'black')
                .attr('stroke-width', 2)
                .attr('fill', 'transparent');
        };

        // Calculate theta for positioning
        const uniqueLinks = _.uniqBy(linksRef.current, (node: Link) => node.targetId);
        thetaRef.current = 2 * Math.PI / uniqueLinks.length;

        // Draw artist circles
        console.log('=== DRAWING ARTIST CIRCLES ===');
        console.log('Links to draw:', linksRef.current.length);
        
        // Debug first few links for originalIndex
        linksRef.current.slice(0, 5).forEach((link, i) => {
            console.log(`Link ${i}:`, {
                targetId: link.targetId,
                targetName: link.target?.name,
                originalIndex: link.props?.originalIndex,
                year: link.props?.data?.year,
                count: link.props?.data?.count
            });
        });

        artist.selectAll('circle')
            .data(linksRef.current)
            .join('circle')
            .attr('id', (d: Link) => `node-${d.target.id}-${d.props.data.year}`)
            .transition().duration(250)
            .attr('r', (d: Link) => scales.nodeR(d.props.data.count))
            .attr('cx', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                const x = getXCoordinates(d.props.data.year, angle) + width / 2;
                
                // Debug positioning
                if (Math.random() < 0.1) { // Log 10% of calculations
                    console.log(`Position calc for ${d.target.name}:`, {
                        originalIndex: d.props.originalIndex,
                        angle: angle,
                        year: d.props.data.year,
                        x: x,
                        width: width
                    });
                }
                
                d.target.x = x;
                return x;
            })
            .attr('cy', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                const y = getYCoordinates(d.props.data.year, angle) + height / 2;
                d.target.y = y;
                return y;
            })
            .attr('opacity', 0.75)
            .attr('stroke', (d: Link) => state.colors.colors.get(d.props.group) || 'black')
            .attr('stroke-width', 2)
            .attr('fill', 'transparent');

        // Add event listeners
        artist.selectAll('circle')
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
                    artist.selectAll('circle').attr('stroke', (d: any) => state.colors.colors.get(d.props.group) || 'black');
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

                console.log('Clicked circle:', data);

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
                .attr('fill', (d: Link) => state.colors.colors.get(d.props.group) || 'black')
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
                        
                        d3.select('body').append('div')
                            .attr('class', 'outer-circle-tooltip')
                            .style('position', 'absolute')
                            .style('background-color', 'rgba(0, 0, 0, 0.9)')
                            .style('color', 'white')
                            .style('padding', '10px')
                            .style('border-radius', '5px')
                            .style('font-size', '12px')
                            .style('left', `${event.clientX + 10}px`)
                            .style('top', `${event.clientY - 10}px`)
                            .style('z-index', '1000')
                            .style('pointer-events', 'none')
                            .style('box-shadow', '0 2px 5px rgba(0,0,0,0.3)')
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
                            .attr('stroke', (circleData: any) => state.colors.colors.get(circleData.props.group) || 'black')
                            .attr('stroke-width', 2);
                    }
                })
                .on('click', (event: any, d: any) => {
                    // Remove any existing tooltips
                    d3.selectAll('.label-tooltip, .outer-circle-tooltip').remove();
                    
                    // Set state.selection to true
                    setState(prev => ({ ...prev, selection: true }));

                    // ctrl+click to deselect
                    if (event.ctrlKey) {
                        setState(prev => ({ ...prev, selection: false }));

                        // Reset all styles
                        outerCircle.selectAll('circle').attr('stroke', 'none').attr('stroke-width', 0);
                        artist.selectAll('circle').attr('stroke', (circleData: any) => state.colors.colors.get(circleData.props.group) || 'black').attr('stroke-width', 2);
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
                return getXCoordinates(YEAR_RANGE.max, angle, 60) + width / 2;
            })
            .attr('y', (d: Link) => {
                const angle = getAngle(d.props.originalIndex);
                return getYCoordinates(YEAR_RANGE.max, angle, 60) + height / 2;
            })
            .attr('transform', (d: Link) => {
                const x1 = 0 + width / 2;
                const y1 = 0 + height / 2;
                const angle = getAngle(d.props.originalIndex);
                const x2 = getXCoordinates(YEAR_RANGE.max, angle, 60) + width / 2;
                const y2 = getYCoordinates(YEAR_RANGE.max, angle, 60) + height / 2;

                const dx = x2 - x1;
                const dy = y2 - y1;

                // Calculate the rotation angle in radians
                let rotationAngleRadians = Math.atan2(dy, dx);

                // Ensure the angle is non-negative (between 0 and 2*pi)
                if (rotationAngleRadians < 0) {
                    rotationAngleRadians += 2 * Math.PI;
                }

                // Ensure the angle is between 0 and 2*pi
                rotationAngleRadians %= 2 * Math.PI;

                // Convert the rotation angle from radians to degrees
                let rotationAngleDegrees = (rotationAngleRadians * 180) / Math.PI;

                // if between 90 and 270 rotate by an additional 180 degrees
                if (rotationAngleDegrees > 90 && rotationAngleDegrees < 270) {
                    rotationAngleDegrees += 180;
                }

                return `rotate(${rotationAngleDegrees}, ${x2}, ${y2})`;
            })
            .attr('text-anchor', (d: Link) => {
                const x1 = 0 + width / 2;
                const y1 = 0 + height / 2;
                const angle = getAngle(d.props.originalIndex);
                const x2 = getXCoordinates(YEAR_RANGE.max, angle, 60) + width / 2;
                const y2 = getYCoordinates(YEAR_RANGE.max, angle, 60) + height / 2;

                const dx = x2 - x1;
                const dy = y2 - y1;

                // Calculate the rotation angle in radians
                let rotationAngleRadians = Math.atan2(dy, dx);

                // Ensure the angle is non-negative (between 0 and 2*pi)
                if (rotationAngleRadians < 0) {
                    rotationAngleRadians += 2 * Math.PI;
                }

                // Ensure the angle is between 0 and 2*pi
                rotationAngleRadians %= 2 * Math.PI;

                // Convert the rotation angle from radians to degrees
                const rotationAngleDegrees = (rotationAngleRadians * 180) / Math.PI;

                return (rotationAngleDegrees > 90 && rotationAngleDegrees < 270) ? 'end' : 'start';
            })
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('dy', '0.35em')
            .text((d: Link) => d.target.name)
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
                
                d3.select('body').append('div')
                    .attr('class', 'label-tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '8px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${event.clientX + 10}px`)
                    .style('top', `${event.clientY - 10}px`)
                    .style('z-index', '1000')
                    .style('pointer-events', 'none')
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
                        .attr('stroke', (circleData: any) => state.colors.colors.get(circleData.props.group) || 'black')
                        .attr('stroke-width', 2)
                        .attr('stroke-opacity', 1);
                }
            })
            .on('click', (event: PointerEvent, d: Link) => {
                // Remove any existing tooltips
                d3.selectAll('.label-tooltip, .outer-circle-tooltip').remove();
                
                // Set state.selection to true
                setState(prev => ({ ...prev, selection: true }));

                // Reset font weight of all labels
                artist.selectAll('.artist-label').attr('font-weight', 'normal');

                // ctrl+click to deselect
                if (event.ctrlKey) {
                    // Set state.selection to false
                    setState(prev => ({ ...prev, selection: false }));

                    // Unhighlight all nodes 
                    artist.selectAll('circle').attr('stroke', (circleData: any) => state.colors.colors.get(circleData.props.group) || 'black');
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

    const drawDonutChart = useCallback(() => {
        const { donut } = containersRef.current;
        const { width, height } = state.dimensions;
        const scales = scalesRef.current;
        
        if (!donut || !linksRef.current.length) return;

        console.log('=== DRAWING DONUT CHART ===');
        console.log('Total links for donut:', linksRef.current.length);
        
        // Debug: Show how links are grouped in order
        const groupSequence = linksRef.current.map(link => ({
            targetId: link.targetId,
            group: link.props.group,
            originalIndex: link.props.originalIndex
        }));
        console.log('Link sequence by group:', groupSequence.slice(0, 20));
        
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
        
        console.log('Theta (angle per node):', theta);
        console.log('Total unique nodes:', uniqueNodes.length);
        
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
            .attr('fill', (d: Link) => state.colors.colors.get(d.props.group) || 'black')
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
                const percentage = (linksRef.current.filter(link => link.props.group === d.props.group).length / linksRef.current.length) * 100;
                console.log(`${d.props.group}: ${percentage.toFixed(1)}%`);
            })
            .on('click', (event: MouseEvent, d: Link) => {
                console.log('Clicked group:', d.props.group);
                arcClickCallback?.();
            });

        // Draw group labels
        donut.selectAll('.donut-label')
            .data(uniqueGroups)
            .join('text')
            .attr('class', 'donut-label')
            .attr('id', (d: Link) => `donut-label-${d.props.group}`)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', 'black')
            .attr('x', (d: Link) => {
                const startAngle = arc.startAngle()(d);
                const endAngle = arc.endAngle()(d);
                const midAngle = (startAngle + endAngle) / 2;
                const labelRadius = scales.r(YEAR_RANGE.max) + 35;
                return Math.cos(midAngle - Math.PI / 2) * labelRadius;
            })
            .attr('y', (d: Link) => {
                const startAngle = arc.startAngle()(d);
                const endAngle = arc.endAngle()(d);
                const midAngle = (startAngle + endAngle) / 2;
                const labelRadius = scales.r(YEAR_RANGE.max) + 35;
                return Math.sin(midAngle - Math.PI / 2) * labelRadius;
            })
            .text((d: Link) => d.props.group);
            
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

    // Update visualization when links change
    useEffect(() => {
        console.log('=== LINKS CHANGE EFFECT ===');
        console.log('Links:', links?.length || 0);
        console.log('Is initialized:', isInitializedRef.current);
        
        if (links && links.length > 0 && isInitializedRef.current) {
            console.log('Updating network visualization with', links.length, 'links');
            updateVisualization();
        } else {
            console.log('Skipping visualization update - conditions not met');
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
            // Reset all elements to default opacity
            artist.selectAll('circle')
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1);

            outerCircle?.selectAll('circle')
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1);

            donut?.selectAll('path')
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1);

            artist.selectAll('.artist-label')
                .attr('opacity', 1);
        } else {
            const prop = state.groupBy;

            // Dim all elements first
            artist.selectAll('circle')
                .attr('opacity', 0.5)
                .attr('stroke-opacity', 0.5)
                .attr('fill-opacity', 0.5);

            outerCircle?.selectAll('circle')
                .attr('opacity', 0.5)
                .attr('stroke-opacity', 0.5)
                .attr('fill-opacity', 0.5);

            donut?.selectAll('path')
                .attr('opacity', 0.5)
                .attr('stroke-opacity', 0.5)
                .attr('fill-opacity', 0.5);

            artist.selectAll('.artist-label')
                .attr('opacity', 0.25);

            // Highlight elements matching the group
            artist.selectAll('circle')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .raise();

            artist.selectAll('.artist-label')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .raise();

            outerCircle?.selectAll('circle')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .raise();

            donut?.select(`#donut-${group}`)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .raise();
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
