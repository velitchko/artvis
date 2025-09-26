import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import { Link } from '../../models/link';
import { countryColors, sexColors, ageGroupColors, livingColors } from '../../colors/colors';

// Types
interface AreaChartProps {
    links: Link[];
    colors?: { group: string; colors: Map<string, string> };
    stacked?: boolean;
    groupBy?: string;
    coExhibitionCount?: number;
    onclick?: (group: string) => void;
}

interface AreaChartState {
    dimensions: { width: number; height: number };
    stacked: boolean;
    groupBy: string;
    coEx: number;
}

interface ChartData {
    group: string;
    data: Array<{ year: number; count: number }>;
}

interface D3Elements {
    svg?: d3.Selection<any, any, any, any>;
    xAxis?: d3.Selection<any, any, any, any>;
    yAxis?: d3.Selection<any, any, any, any>;
    tooltip?: d3.Selection<any, any, any, any>;
    xScale?: d3.ScaleLinear<number, number>;
    yScale?: d3.ScaleLinear<number, number>;
}

// Constants
const YEAR_RANGE = { min: 1905, max: 1915 };
const DEFAULT_CO_EX = 3;
const MARGINS = { top: 50, bottom: 30, left: 30, right: 30 };

// Color utility function - matches ego network implementation
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
                    
                    console.log('Area chart - Added colors for additional countries:', additionalCountries);
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
const calculateCoExhibitorGroupDistribution = (
    links: Link[],
    group: string = 'country',
    coEx: number = DEFAULT_CO_EX
): Map<number, Map<string, number>> => {
    const distribution = new Map<number, Map<string, number>>();

    const filteredLinks = links.filter((link: Link) => {
        const sum = links
            .filter((l: Link) => l.targetId === link.targetId)
            .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
        return sum >= coEx && 
               link.props.data.year >= YEAR_RANGE.min && 
               link.props.data.year <= YEAR_RANGE.max;
    });

    filteredLinks.forEach((link: Link) => {
        const year = link.props.data.year;
        // Use the grouping from the link props (set by ego network) if available, 
        // otherwise fallback to target props
        const grouping = link.props.group || getGroupValue(link.target.props, group);
        
        if (!grouping) return;

        if (!distribution.has(year)) {
            distribution.set(year, new Map());
        }

        const yearMap = distribution.get(year)!;
        yearMap.set(grouping, (yearMap.get(grouping) || 0) + 1);
    });

    return new Map([...distribution.entries()].sort());
};

const getGroupValue = (props: any, group: string): string | null => {
    switch (group) {
        case 'country':
            // Try multiple possible property names for country
            return props.country || props.data?.country || props.location?.country || null;
        case 'sex':
            return props.sex || props.data?.sex || null;
        case 'ageGroup':
            return calculateAgeGroup(props.birth_year || props.data?.birth_year) || null;
        default:
            return null;
    }
};

const calculateAgeGroup = (birthYear: number): string => {
    // This would need base artist birth year for comparison
    // For now, return a placeholder
    const baseYear = 1880; // This should come from props
    const ageDiff = birthYear - baseYear;
    const groupSize = 5;
    const groupIndex = Math.floor(ageDiff / groupSize) * groupSize;
    return `${groupIndex >= 0 ? '+' : ''}${groupIndex}`;
};

const processChartData = (
    distribution: Map<number, Map<string, number>>,
    stacked: boolean
): ChartData[] => {
    const allGroups = new Set<string>();
    distribution.forEach(yearMap => {
        yearMap.forEach((_, group) => allGroups.add(group));
    });

    console.log('All groups identified:', Array.from(allGroups));

    if (stacked) {
        // Return data structure for stacked chart
        return Array.from(allGroups).map(group => {
            const data: Array<{ year: number; count: number }> = [];
            for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
                const count = distribution.get(year)?.get(group) || 0;
                data.push({ year, count });
            }
            return { group, data };
        });
    } else {
        // Return data structure for non-stacked chart
        return Array.from(allGroups).map(group => {
            const data: Array<{ year: number; count: number }> = [];
            for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
                const count = distribution.get(year)?.get(group) || 0;
                data.push({ year, count });
            }
            return { group, data };
        });
    }
};

// Main component
const AreaChartComponent: React.FC<AreaChartProps> = ({
    links,
    colors,
    stacked = true, // Default to stacked area chart
    groupBy = 'country',
    coExhibitionCount,
    onclick
}) => {
    // Refs
    const d3ElementsRef = useRef<D3Elements>({});
    const selectedGroupRef = useRef('');
    const ageGroupMapRef = useRef<Map<string, string>>(new Map());
    const isInitializedRef = useRef(false);

    // State
    const [state, setState] = useState<AreaChartState>({
        dimensions: { width: 0, height: 0 },
        stacked: stacked ?? true, // Default to stacked
        groupBy: groupBy || 'country', // Default to country
        coEx: coExhibitionCount ?? DEFAULT_CO_EX
    });

    // Custom hooks
    const dimensions = useResizeObserver('area-chart-container');

    // Update dimensions when container size changes
    useEffect(() => {
        if (dimensions.width && dimensions.height) {
            setState(prev => ({
                ...prev,
                dimensions
            }));
        }
    }, [dimensions]);

    // Initialize chart when dimensions are available
    useEffect(() => {
        if (state.dimensions.width && state.dimensions.height && !isInitializedRef.current) {
            console.log('=== INITIALIZING AREA CHART ===');
            console.log('Dimensions:', state.dimensions);
            initializeChart();
            isInitializedRef.current = true;
        }
    }, [state.dimensions]);

    // Update state when props change
    useEffect(() => {
        console.log('=== AREA CHART PROPS CHANGE ===');
        console.log('Props - groupBy:', groupBy, 'coExhibitionCount:', coExhibitionCount, 'stacked:', stacked);
        console.log('Props - links length:', links?.length, 'colors:', colors);
        
        setState(prev => ({
            ...prev,
            groupBy: groupBy || 'country', // Always ensure default
            stacked: stacked ?? true, // Default to stacked
            coEx: coExhibitionCount ?? DEFAULT_CO_EX
        }));
    }, [groupBy, stacked, coExhibitionCount, links, colors]);

    // Update chart when data or settings change
    useEffect(() => {
        if (state.dimensions.width && state.dimensions.height && isInitializedRef.current && links?.length > 0) {
            console.log('=== TRIGGERING AREA CHART UPDATE ===');
            console.log('Update conditions:', { 
                hasData: links?.length > 0, 
                initialized: isInitializedRef.current,
                dimensions: state.dimensions,
                chartDataLength: chartData.length
            });
            
            // Small delay to ensure chartData is ready
            const timer = setTimeout(() => {
                if (chartData.length > 0) {
                    updateChart();
                } else {
                    console.log('Chart data not ready yet, skipping update');
                }
            }, 50);
            
            return () => clearTimeout(timer);
        }
    }, [links, state.groupBy, state.coEx, state.stacked, colors]);



    // Memoized chart data and colors
    const { chartData, dynamicColors } = useMemo(() => {
        console.log('=== AREA CHART DATA CALCULATION ===');
        console.log('Links:', links?.length || 0, 'GroupBy:', state.groupBy, 'CoEx:', state.coEx, 'Stacked:', state.stacked);
        
        if (!links || links.length === 0) {
            console.log('No links available for chart data');
            return { chartData: [], dynamicColors: null };
        }
        
        const distribution = calculateCoExhibitorGroupDistribution(links, state.groupBy, state.coEx);
        console.log('Distribution size:', distribution.size);
        
        const processedData = processChartData(distribution, state.stacked);
        console.log('Processed chart data length:', processedData.length);
        
        // Generate dynamic colors based on actual groups found
        const uniqueGroups = processedData.map(d => d.group);
        const colorMapping = getColorMapping(state.groupBy, uniqueGroups);
        const generatedColors = { group: state.groupBy, colors: colorMapping };
        
        console.log('Generated colors for groups:', uniqueGroups, 'Color mapping:', Array.from(colorMapping.entries()));
        
        return { chartData: processedData, dynamicColors: generatedColors };
    }, [links, state.groupBy, state.coEx, state.stacked]);

    // Callbacks
    const initializeChart = useCallback(() => {
        const { width, height } = state.dimensions;

        // Clear existing chart
        d3.select('#area-chart').selectAll('*').remove();

        const svg = d3.select('#area-chart')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('overflow', 'visible');

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
            .attr('y', height - MARGINS.bottom + 36)
            .attr('text-anchor', 'middle')
            .text('Year');

        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('x', -height / 2)
            .attr('y', MARGINS.left / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Number of Co-Exhibitors');

        // Setup containers
        svg.append('g').attr('id', 'area-wrapper');
        svg.append('g')
            .attr('id', 'legend-wrapper')
            .attr('transform', `translate(${width / 2}, 0)`);

        // Store D3 elements
        d3ElementsRef.current = {
            svg,
            xAxis,
            yAxis,
            xScale: d3.scaleLinear().range([MARGINS.left * 2, width - MARGINS.right]),
            yScale: d3.scaleLinear().range([height - MARGINS.top, MARGINS.top])
        };

    }, [state.dimensions]);

    const updateChart = useCallback(() => {
        console.log('=== AREA CHART UPDATE CALLED ===');
        const { svg, xAxis, yAxis, xScale, yScale } = d3ElementsRef.current;
        
        // Use dynamically generated colors if available, otherwise fall back to passed colors
        const activeColors = dynamicColors || colors;
        
        console.log('D3 Elements check:', {
            svg: !!svg,
            xAxis: !!xAxis,
            yAxis: !!yAxis,
            xScale: !!xScale,
            yScale: !!yScale,
            chartDataLength: chartData.length,
            'using dynamic colors': !!dynamicColors,
            'active colors entries': activeColors?.colors ? Array.from(activeColors.colors.entries()) : 'no colors map'
        });
        
        if (!svg || !xAxis || !yAxis || !xScale || !yScale) {
            console.log('Early return - missing D3 elements');
            return;
        }
        
        if (!chartData.length) {
            console.log('Early return - no chart data available');
            return;
        }

        // Update scale domains
        xScale.domain([YEAR_RANGE.min, YEAR_RANGE.max]);

        const maxCount = d3.max(chartData, d => d3.max(d.data, dd => dd.count)) || 0;
        yScale.domain([0, maxCount]);

        // Draw chart based on stacked mode
        if (state.stacked) {
            drawStackedChart(chartData, activeColors);
        } else {
            drawChart(chartData, activeColors);
        }

        // Add legend
        addLegend(chartData, activeColors);

        // Update axes
        const xAxisGenerator = d3.axisBottom(xScale).tickFormat(d3.format('d'));
        const yAxisGenerator = d3.axisLeft(yScale).tickFormat(d3.format('d')).ticks(5);

        xAxis.call(xAxisGenerator);
        yAxis.call(yAxisGenerator);
        
        console.log('=== AREA CHART UPDATE COMPLETE ===');
    }, [chartData, state.stacked, colors, dynamicColors]);

    const drawStackedChart = useCallback((data: ChartData[], activeColors?: { group: string; colors: Map<string, string> }) => {
        const { svg, xScale, yScale } = d3ElementsRef.current;
        if (!svg || !xScale || !yScale) return;

        svg.selectAll('.area').remove();

        // Convert data to format suitable for d3.stack
        const years = d3.range(YEAR_RANGE.min, YEAR_RANGE.max + 1);
        const groups = data.map(d => d.group);
        
        // Create data array where each element is an object with year and all group values
        const stackData = years.map(year => {
            const yearData: any = { year };
            data.forEach(groupData => {
                const yearCount = groupData.data.find(d => d.year === year)?.count || 0;
                yearData[groupData.group] = yearCount;
            });
            return yearData;
        });

        console.log('Stack data prepared:', stackData);

        const stack = d3.stack<any>()
            .keys(groups)
            .value((d, key) => d[key] || 0);

        const stackedData = stack(stackData);
        console.log('Stacked data:', stackedData);

        // Update y scale to handle stacked values
        const maxStackedValue = d3.max(stackedData, layer => d3.max(layer, d => d[1])) || 0;
        yScale.domain([0, maxStackedValue]);

        const area = d3.area<any>()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.data.year))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]));

        svg.select('#area-wrapper')
            .selectAll('.area')
            .data(stackedData)
            .join('path')
            .attr('class', 'area')
            .attr('fill', d => {
                const color = activeColors?.colors?.get(d.key) || 'steelblue';
                console.log('Stacked area color for', d.key, ':', color);
                return color;
            })
            .attr('fill-opacity', 0.8)
            .attr('stroke-width', 1)
            .attr('stroke', d => activeColors?.colors?.get(d.key) || 'steelblue')
            .attr('d', area)
            .on('mouseover', handleAreaMouseOver)
            .on('mouseout', handleAreaMouseOut)
            .on('click', handleAreaClick);
    }, []);

    const drawChart = useCallback((data: ChartData[], activeColors?: { group: string; colors: Map<string, string> }) => {
        const { svg, xScale, yScale } = d3ElementsRef.current;
        if (!svg || !xScale || !yScale) return;

        svg.selectAll('.area').remove();

        const area = d3.area<{ year: number; count: number }>()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.year))
            .y0(yScale(0))
            .y1(d => yScale(d.count));

        svg.select('#area-wrapper')
            .selectAll('.area')
            .data(data)
            .join('path')
            .attr('class', 'area')
            .attr('d', d => area(d.data))
            .attr('fill', d => {
                const color = activeColors?.colors?.get(d.group) || 'steelblue';
                console.log('Area color for', d.group, ':', color);
                return color;
            })
            .attr('fill-opacity', 0.25)
            .attr('stroke', d => activeColors?.colors?.get(d.group) || 'steelblue')
            .attr('stroke-width', 2)
            .on('mouseover', handleAreaMouseOver)
            .on('mouseout', handleAreaMouseOut)
            .on('click', handleAreaClick);
    }, []);

    const addLegend = useCallback((data: ChartData[], activeColors?: { group: string; colors: Map<string, string> }) => {
        const { svg } = d3ElementsRef.current;
        if (!svg) return;

        svg.selectAll('.legend-item').remove();

        const groups = data.map(d => d.group);
        const legend = svg.select('#legend-wrapper');

        // Center the legend and position it lower
        legend.attr('transform', 
            `translate(${(state.dimensions.width / 2) - (groups.length * 40) / 2}, 35)`
        );

        const legendItems = legend.selectAll('.legend-item')
            .data(groups)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 40}, 0)`);

        legendItems.append('circle')
            .attr('r', 8)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', d => {
                const color = activeColors?.colors?.get(d) || 'steelblue';
                console.log('Legend color for', d, ':', color);
                return color;
            });

        legendItems.append('text')
            .attr('x', 0)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text(d => d);

        legendItems
            .on('mouseover', handleLegendMouseOver)
            .on('mouseout', handleLegendMouseOut)
            .on('click', handleLegendClick);
    }, [state.dimensions]);

    // Event handlers
    const handleAreaMouseOver = useCallback((event: MouseEvent, d: any) => {
        console.log('Area mouseover:', d);
    }, []);

    const handleAreaMouseOut = useCallback(() => {
        console.log('Area mouseout');
    }, []);

    const handleAreaClick = useCallback((event: MouseEvent, d: any) => {
        const group = d.key || d.group;
        onclick?.(group);
    }, [onclick]);

    const handleLegendMouseOver = useCallback((event: MouseEvent, d: string) => {
        highlightGroup(d);
    }, []);

    const handleLegendMouseOut = useCallback(() => {
        highlightGroup('');
    }, []);

    const handleLegendClick = useCallback((event: MouseEvent, d: string) => {
        onclick?.(d);
    }, [onclick]);

    // Public methods
    const highlightGroup = useCallback((group: string) => {
        selectedGroupRef.current = group;
        
        const areas = d3.selectAll('.area');
        
        if (group === '') {
            areas.attr('fill-opacity', state.stacked ? 1 : 0.25);
        } else {
            areas.attr('fill-opacity', (d: any) => {
                const dataGroup = d.key || d.group;
                return dataGroup === group ? (state.stacked ? 1 : 0.75) : 0.1;
            });
        }
    }, [state.stacked]);

    const updateColors = useCallback((newColors: { group: string; colors: Map<string, string> }) => {
        setState(prev => ({ ...prev, groupBy: newColors.group }));
        updateChart();
    }, [updateChart]);

    const updateCoEx = useCallback((groupBy?: string, coEx?: number) => {
        setState(prev => ({
            ...prev,
            groupBy: groupBy || prev.groupBy,
            coEx: coEx || prev.coEx
        }));
    }, []);

    return (
        <div id="area-chart-container" className="area-chart-container w-full h-full">
            <svg id="area-chart" className="w-full h-full" />
        </div>
    );
};

export default AreaChartComponent;
