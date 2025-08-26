import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import { Link } from '../../models/link';

// Types
interface AreaChartProps {
    links: Link[];
    colors?: { group: string; colors: Map<string, string> };
    stacked?: boolean;
    groupBy?: string;
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
        const grouping = getGroupValue(link.target.props, group);
        
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
            return props.country || null;
        case 'sex':
            return props.sex || null;
        case 'ageGroup':
            return calculateAgeGroup(props.birth_year) || null;
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
    stacked = false,
    groupBy = 'country',
    onclick
}) => {
    // Refs
    const d3ElementsRef = useRef<D3Elements>({});
    const selectedGroupRef = useRef('');
    const ageGroupMapRef = useRef<Map<string, string>>(new Map());

    // State
    const [state, setState] = useState<AreaChartState>({
        dimensions: { width: 0, height: 0 },
        stacked,
        groupBy,
        coEx: DEFAULT_CO_EX
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
        if (state.dimensions.width && state.dimensions.height) {
            initializeChart();
        }
    }, [state.dimensions]);

    // Update chart when data or settings change
    useEffect(() => {
        if (state.dimensions.width && state.dimensions.height) {
            updateChart();
        }
    }, [links, state.groupBy, state.coEx, state.stacked, colors]);

    // Memoized chart data
    const chartData = useMemo(() => {
        const distribution = calculateCoExhibitorGroupDistribution(links, state.groupBy, state.coEx);
        return processChartData(distribution, state.stacked);
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
        const { svg, xAxis, yAxis, xScale, yScale } = d3ElementsRef.current;
        
        if (!svg || !xAxis || !yAxis || !xScale || !yScale || !chartData.length) return;

        // Update scale domains
        xScale.domain([YEAR_RANGE.min, YEAR_RANGE.max]);

        const maxCount = d3.max(chartData, d => d3.max(d.data, dd => dd.count)) || 0;
        yScale.domain([0, maxCount]);

        // Draw chart based on stacked mode
        if (state.stacked) {
            drawStackedChart(chartData);
        } else {
            drawChart(chartData);
        }

        // Add legend
        addLegend(chartData);

        // Update axes
        const xAxisGenerator = d3.axisBottom(xScale).tickFormat(d3.format('d'));
        const yAxisGenerator = d3.axisLeft(yScale).tickFormat(d3.format('d')).ticks(5);

        xAxis.call(xAxisGenerator);
        yAxis.call(yAxisGenerator);
    }, [chartData, state.stacked]);

    const drawStackedChart = useCallback((data: ChartData[]) => {
        const { svg, xScale, yScale } = d3ElementsRef.current;
        if (!svg || !xScale || !yScale) return;

        svg.selectAll('.area').remove();

        // Prepare data for stacking
        const flatData = data.flatMap(d => 
            d.data.map(dd => ({ group: d.group, year: dd.year, count: dd.count }))
        );

        const stack = d3.stack<any>()
            .keys(d3.union(flatData.map(d => d.group)))
            .value(([, D], key) => D.get(key)?.count || 0)
            (d3.index(flatData, d => d.year, d => d.group));

        const area = d3.area<any>()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.data[0]))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]));

        svg.select('#area-wrapper')
            .selectAll('.area')
            .data(stack)
            .join('path')
            .attr('class', 'area')
            .attr('fill', d => colors?.colors.get(d.key) || 'black')
            .attr('fill-opacity', 1)
            .attr('stroke-width', 0)
            .attr('d', area)
            .on('mouseover', handleAreaMouseOver)
            .on('mouseout', handleAreaMouseOut)
            .on('click', handleAreaClick);
    }, [colors]);

    const drawChart = useCallback((data: ChartData[]) => {
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
            .attr('fill', d => colors?.colors.get(d.group) || 'black')
            .attr('fill-opacity', 0.25)
            .attr('stroke', d => colors?.colors.get(d.group) || 'black')
            .attr('stroke-width', 2)
            .on('mouseover', handleAreaMouseOver)
            .on('mouseout', handleAreaMouseOut)
            .on('click', handleAreaClick);
    }, [colors]);

    const addLegend = useCallback((data: ChartData[]) => {
        const { svg } = d3ElementsRef.current;
        if (!svg) return;

        svg.selectAll('.legend-item').remove();

        const groups = data.map(d => d.group);
        const legend = svg.select('#legend-wrapper');

        // Center the legend
        legend.attr('transform', 
            `translate(${(state.dimensions.width / 2) - (groups.length * 40) / 2}, 20)`
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
            .attr('fill', d => colors?.colors.get(d) || 'black');

        legendItems.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('text-anchor', 'start')
            .attr('transform', 'rotate(-20)')
            .text(d => d);

        legendItems
            .on('mouseover', handleLegendMouseOver)
            .on('mouseout', handleLegendMouseOut)
            .on('click', handleLegendClick);
    }, [colors, state.dimensions]);

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
        <div className="area-chart-container w-full h-full">
            <svg id="area-chart" className="w-full h-full" />
        </div>
    );
};

export default AreaChartComponent;
