import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Group } from '../../models/group.model';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { countryColors, sexColors, ageGroupColors } from '../../colors/colors';

interface GroupAreaChartProps {
    group: Group;
    groupBy?: string;
    stacked?: boolean;
    onclick?: (group: string) => void;
}

interface ChartData {
    group: string;
    data: Array<{ year: number; count: number }>;
}

const YEAR_RANGE = { min: 1905, max: 1915 };
const MARGINS = { top: 55, bottom: 50, left: 50, right: 30 };

// Get color mapping for different groupings
const getColorMapping = (groupType: string, uniqueGroups?: string[]): Map<string, string> => {
    switch (groupType) {
        case 'sex':
            return sexColors;
        case 'country':
            const countryColorMap = new Map(countryColors);
            if (uniqueGroups) {
                const predefinedCountries = new Set(countryColors.keys());
                const additionalCountries = uniqueGroups.filter(country => 
                    !predefinedCountries.has(country) && country !== 'Unknown'
                );
                if (additionalCountries.length > 0) {
                    const additionalColorScale = d3.scaleOrdinal(d3.schemeCategory10);
                    additionalCountries.forEach((country, index) => {
                        countryColorMap.set(country, additionalColorScale(index.toString()));
                    });
                }
            }
            return countryColorMap;
        case 'ageGroup':
            const ageGroupMap = new Map<string, string>();
            if (uniqueGroups) {
                const sortedAgeGroups = [...uniqueGroups].sort((a: string, b: string) => {
                    if (a === 'unknown') return 1;
                    if (b === 'unknown') return -1;
                    return a.localeCompare(b);
                });
                
                sortedAgeGroups.forEach((ageGroup: string, index: number) => {
                    let color = '#333333';
                    if (ageGroup === 'unknown') color = '#333333';
                    else color = ageGroupColors(index / Math.max(sortedAgeGroups.length - 1, 1));
                    
                    ageGroupMap.set(ageGroup, color);
                });
            }
            return ageGroupMap;
        default:
            return new Map();
    }
};

// Calculate age group based on birth year
const calculateAgeGroup = (birthYear?: number): string => {
    if (!birthYear) return 'unknown';
    const groupSize = 10;
    const baseYear = 1850;
    const ageDiff = birthYear - baseYear;
    const groupIndex = Math.floor(ageDiff / groupSize) * groupSize;
    return `${baseYear + groupIndex}-${baseYear + groupIndex + groupSize - 1}`;
};

// Get grouping value from artist
const getGroupValue = (artist: Artist, groupBy: string): string => {
    switch (groupBy) {
        case 'country':
            return artist.country || 'Unknown';
        case 'sex':
            return artist.sex || 'Unknown';
        case 'ageGroup':
            return calculateAgeGroup(artist.birthyear);
        default:
            return 'Unknown';
    }
};

const GroupAreaChart: React.FC<GroupAreaChartProps> = ({
    group,
    groupBy = 'country',
    stacked = true,
    onclick
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [selectedGroup, setSelectedGroup] = useState<string>('');

    // Process data: count exhibitions per year per group
    const chartData = useMemo(() => {
        if (!group?.artistsMemberOf || group.artistsMemberOf.length === 0) {
            return [];
        }

        // Build a map: year -> groupValue -> Set of exhibition IDs
        const distribution = new Map<number, Map<string, Set<number>>>();

        group.artistsMemberOf.forEach((member: Artist) => {
            if (!member.exhibitedAtExhibitions) return;

            const groupValue = getGroupValue(member, groupBy);

            member.exhibitedAtExhibitions.forEach((exhibition: Exhibition) => {
                const year = +exhibition.startyear;
                const exhibitionId = +exhibition.id;

                if (year < YEAR_RANGE.min || year > YEAR_RANGE.max) return;

                if (!distribution.has(year)) {
                    distribution.set(year, new Map());
                }

                const yearMap = distribution.get(year)!;
                if (!yearMap.has(groupValue)) {
                    yearMap.set(groupValue, new Set());
                }

                yearMap.get(groupValue)?.add(exhibitionId);
            });
        });

        // Get all unique groups
        const allGroups = new Set<string>();
        distribution.forEach(yearMap => {
            yearMap.forEach((_, groupValue) => allGroups.add(groupValue));
        });

        // Convert to chart data structure
        return Array.from(allGroups).map(groupValue => {
            const data: Array<{ year: number; count: number }> = [];
            for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
                const exhibitionSet = distribution.get(year)?.get(groupValue);
                const count = exhibitionSet ? exhibitionSet.size : 0;
                data.push({ year, count });
            }
            return { group: groupValue, data };
        });
    }, [group, groupBy]);

    // Get unique groups for color mapping
    const uniqueGroups = useMemo(() => {
        return chartData.map(d => d.group);
    }, [chartData]);

    // Get colors
    const colorMap = useMemo(() => {
        return getColorMapping(groupBy, uniqueGroups);
    }, [groupBy, uniqueGroups]);

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Draw chart
    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0 || chartData.length === 0) {
            return;
        }

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { width, height } = dimensions;
        const innerWidth = width - MARGINS.left - MARGINS.right;
        const innerHeight = height - MARGINS.top - MARGINS.bottom;

        // sort chartData by total count (ascending) to produce a stable stacking order
        const sortedChartData = [...chartData].sort((a, b) => {
            const aSum = a.data.reduce((acc, cur) => acc + cur.count, 0);
            const bSum = b.data.reduce((acc, cur) => acc + cur.count, 0);
            return aSum - bSum;
        });
        // Create main group
        const g = svg
            .append('g')
            .attr('transform', `translate(${MARGINS.left},${MARGINS.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain([YEAR_RANGE.min, YEAR_RANGE.max])
            .range([0, innerWidth]);

        const maxY = d3.max(
            Array.from({ length: YEAR_RANGE.max - YEAR_RANGE.min + 1 }, (_, i) => {
                const year = YEAR_RANGE.min + i;
                if (stacked) {
                    return d3.sum(chartData, d => d.data.find(pt => pt.year === year)?.count || 0);
                } else {
                    return d3.max(chartData, d => d.data.find(pt => pt.year === year)?.count || 0) || 0;
                }
            })
        ) || 1;

        const yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([innerHeight, 0])
            .nice();

        // Determine ordered keys (by ascending total) for stacking
        const orderedKeys = sortedChartData.map(d => d.group);

        // Stack generator for stacked area using explicit key order
        const stack = d3.stack<any>()
            .keys(orderedKeys)
            .value((d: any, key: string) => d[key] || 0);

        // Prepare data for stacking
        const stackData: any[] = [];
        for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
            const dataPoint: any = { year };
            // respect ordered keys when populating the stack data
            sortedChartData.forEach(series => {
                const count = series.data.find(d => d.year === year)?.count || 0;
                dataPoint[series.group] = count;
            });
            stackData.push(dataPoint);
        }

        // Area generator
        const area = d3.area<any>()
            .x((d: any) => xScale(d.data.year))
            .y0((d: any) => yScale(d[0]))
            .y1((d: any) => yScale(d[1]))
            .curve(d3.curveMonotoneX);

        // Line generator (for non-stacked)
        const line = d3.line<{ year: number; count: number }>()
            .x(d => xScale(d.year))
            .y(d => yScale(d.count))
            .curve(d3.curveMonotoneX);

        if (stacked) {
            // Draw stacked areas
            const series = stack(stackData);

            g.selectAll('.area')
                .data(series)
                .enter()
                .append('path')
                .attr('class', 'area')
                .attr('d', area)
                .attr('fill', (d: any) => colorMap.get(d.key) || '#ccc')
                .attr('opacity', (d: any) => selectedGroup === '' || selectedGroup === d.key ? 0.7 : 0.2)
                .style('cursor', 'pointer')
                .on('click', function(_event, d: any) {
                    const newSelection = selectedGroup === d.key ? '' : d.key;
                    setSelectedGroup(newSelection);
                    if (onclick) {
                        onclick(newSelection);
                    }
                })
                .on('mouseover', function(event, d: any) {
                    if (selectedGroup === '' || selectedGroup === d.key) {
                        d3.select(this).attr('opacity', 0.9);
                    }
                })
                .on('mouseout', function(event, d: any) {
                    const opacity = selectedGroup === '' || selectedGroup === d.key ? 0.7 : 0.2;
                    d3.select(this).attr('opacity', opacity);
                });
        } else {
            // Draw lines for each group
            chartData.forEach(series => {
                g.append('path')
                    .datum(series.data)
                    .attr('class', 'line')
                    .attr('fill', 'none')
                    .attr('stroke', colorMap.get(series.group) || '#ccc')
                    .attr('stroke-width', 2)
                    .attr('opacity', selectedGroup === '' || selectedGroup === series.group ? 1 : 0.2)
                    .attr('d', line)
                    .style('cursor', 'pointer')
                    .on('click', function() {
                        const newSelection = selectedGroup === series.group ? '' : series.group;
                        setSelectedGroup(newSelection);
                        if (onclick) {
                            onclick(newSelection);
                        }
                    });
            });
        }

        // X axis
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.format('d'))
            .ticks(YEAR_RANGE.max - YEAR_RANGE.min + 1);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .selectAll('text')
            .style('font-size', '10px');

        // Y axis
        const yAxis = d3.axisLeft(yScale).ticks(5);

        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .selectAll('text')
            .style('font-size', '10px');

        // Y axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -MARGINS.left + 15)
            .attr('x', -innerHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Exhibitions');

        // Legend
        const legend = g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(0, -35)`);

        // Legend should reflect the same ordering but display largest groups last
        const legendOrder = [...sortedChartData].reverse();

        const legendItems = legend.selectAll('.legend-item')
            .data(legendOrder)
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 100}, 0)`)
            .style('cursor', 'pointer')
            .on('click', function(_event, d) {
                const newSelection = selectedGroup === d.group ? '' : d.group;
                setSelectedGroup(newSelection);
                if (onclick) {
                    onclick(newSelection);
                }
            });

        legendItems.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', d => colorMap.get(d.group) || '#ccc')
            .attr('opacity', d => selectedGroup === '' || selectedGroup === d.group ? 0.7 : 0.2);

        legendItems.append('text')
            .attr('x', 16)
            .attr('y', 10)
            .style('font-size', '11px')
            .attr('opacity', d => selectedGroup === '' || selectedGroup === d.group ? 1 : 0.4)
            .text(d => d.group);

    }, [dimensions, chartData, colorMap, stacked, selectedGroup, onclick]);

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg ref={svgRef} width={dimensions.width} height={dimensions.height}></svg>
        </div>
    );
};

export default GroupAreaChart;
