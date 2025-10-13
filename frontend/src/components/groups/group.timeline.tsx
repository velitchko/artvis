import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Group } from '../../models/group.model';
import { processGroupTimelineData, createTimelineWithMissingYears, TimelineData } from '../../utils/groupUtils';

interface GroupTimelineProps {
    group: Group;
    width?: number;
    height?: number;
    onYearHover?: (year: number) => void;
    highlightedYear?: number | null;
    className?: string;
}

const GroupTimeline: React.FC<GroupTimelineProps> = ({
    group,
    width = 800,
    height: propHeight = 150,
    onYearHover,
    highlightedYear,
    className = "w-full h-full"
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [containerWidth, setContainerWidth] = useState(width);
    const [containerHeight, setContainerHeight] = useState(propHeight);

    // Update dimensions based on container size
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerWidth(rect.width || width);
                setContainerHeight(rect.height || propHeight);
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [width, propHeight]);

    const actualWidth = containerWidth;
    const actualHeight = containerHeight;

    // Constants
    const margin = { top: 55, bottom: 50, left: 50, right: 30 };
    const minYear = 1905;
    const maxYear = 1915;
    const innerWidth = actualWidth - margin.left - margin.right;
    const innerHeight = actualHeight - margin.top - margin.bottom;

    // Process timeline data
    const timelineData = useMemo(() => {
        const rawData = processGroupTimelineData(group);
        return createTimelineWithMissingYears(rawData);
    }, [group]);

    // Render timeline
    useEffect(() => {
        if (!svgRef.current || timelineData.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Create main group
        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Scales
        const xScale = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([0, innerWidth]);

        const yScaleExhibitions = d3.scaleLinear()
            .domain([0, d3.max(timelineData, d => d.exhibitions) || 10])
            .range([innerHeight, 0])
            .nice();

        const yScaleItems = d3.scaleLinear()
            .domain([0, d3.max(timelineData, d => d.items) || 10])
            .range([innerHeight, 0])
            .nice();

        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(timelineData, d => d.items) || 10])
            .range([0, 20]);

        // Axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d => d.toString())
            .ticks(maxYear - minYear);

        const yAxis = d3.axisLeft(yScaleExhibitions)
            .ticks(5);

        g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(xAxis)
            .selectAll('text')
            .style('font-size', '10px');

        g.append('g')
            .attr('class', 'y-axis')
            .call(yAxis)
            .selectAll('text')
            .style('font-size', '10px');

        // Y-axis label
        g.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left + 10)
            .attr('x', 0 - (innerHeight / 2))
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#666')
            .text('Number of Exhibitions');

        // Create area for exhibitions
        const areaExhibitions = d3.area<TimelineData>()
            .x(d => xScale(d.year))
            .y0(innerHeight)
            .y1(d => yScaleExhibitions(d.exhibitions))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(timelineData)
            .attr('class', 'area-exhibitions')
            .attr('fill', 'steelblue')
            .attr('fill-opacity', 0.3)
            .attr('d', areaExhibitions);

        // Create line for exhibitions
        const lineExhibitions = d3.line<TimelineData>()
            .x(d => xScale(d.year))
            .y(d => yScaleExhibitions(d.exhibitions))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(timelineData)
            .attr('class', 'line-exhibitions')
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 2)
            .attr('d', lineExhibitions);

        // Create circles for items (artworks)
        const circles = g.selectAll('.circle-items')
            .data(timelineData.filter(d => d.items > 0))
            .enter()
            .append('circle')
            .attr('class', 'circle-items')
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScaleItems(d.items))
            .attr('r', d => radiusScale(d.items))
            .attr('fill', 'orange')
            .attr('fill-opacity', 0.5)
            .attr('stroke', 'darkorange')
            .attr('stroke-width', 1);

        // Tooltip
        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'timeline-tooltip')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        // Interactive bars for hover
        g.selectAll('.hover-bar')
            .data(timelineData)
            .enter()
            .append('rect')
            .attr('class', 'hover-bar')
            .attr('x', d => xScale(d.year) - (innerWidth / (maxYear - minYear)) / 2)
            .attr('y', 0)
            .attr('width', innerWidth / (maxYear - minYear))
            .attr('height', innerHeight)
            .attr('fill', 'transparent')
            .attr('stroke', highlightedYear ? 'orange' : 'none')
            .attr('stroke-width', d => d.year === highlightedYear ? 2 : 0)
            .style('cursor', 'pointer')
            .on('mouseover', function(event, d) {
                tooltip
                    .style('visibility', 'visible')
                    .html(`
                        <strong>${d.year}</strong><br/>
                        Exhibitions: ${d.exhibitions}<br/>
                        Artworks: ${d.items}
                    `);
                
                d3.select(this)
                    .attr('fill', 'rgba(255, 165, 0, 0.1)');
                
                if (onYearHover) {
                    onYearHover(d.year);
                }
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function() {
                tooltip.style('visibility', 'hidden');
                
                d3.select(this)
                    .attr('fill', 'transparent');
                
                if (onYearHover) {
                    onYearHover(null as any);
                }
            });

        // Cleanup
        return () => {
            tooltip.remove();
        };
    }, [timelineData, actualWidth, actualHeight, highlightedYear, onYearHover]);

    return (
        <div ref={containerRef} className={className}>
            <svg
                ref={svgRef}
                width={actualWidth}
                height={actualHeight}
                style={{ display: 'block' }}
            />
        </div>
    );
};

export default GroupTimeline;
