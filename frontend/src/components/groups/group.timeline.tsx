import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Group } from '../../models/group.model';
import { processGroupTimelineData, createTimelineWithMissingYears } from '../../utils/groupUtils';

interface GroupTimelineProps {
    group: Group;
    width?: number;
    height?: number;
    onYearHover?: (year: number | null) => void;
    onEgoNetworkHover?: (year: number | null) => void;
    highlightedYear?: number | null;
    className?: string;
}

const GroupTimeline: React.FC<GroupTimelineProps> = ({
    group,
    width = 800,
    height: propHeight = 150,
    onYearHover,
    onEgoNetworkHover,
    highlightedYear,
    className = "w-full h-full"
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

    const margin = { top: 60, right: 40, bottom: 50, left: 60 };
    const innerWidth = actualWidth - margin.left - margin.right;
    const innerHeight = actualHeight - margin.top - margin.bottom;

    const minYear = 1905;
    const maxYear = 1915;

    // Process timeline data
    const timelineData = useMemo(() => {
        const rawData = processGroupTimelineData(group);
        return createTimelineWithMissingYears(rawData);
    }, [group]);

    // Calculate scales
    const scales = useMemo(() => {
        const xScale = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([margin.left, actualWidth - margin.right]);

        const yExtent = d3.extent(timelineData.map(d => d.exhibitions)) as [number, number];
        const yScale = d3.scaleLinear()
            .domain([0, Math.max(yExtent[1] || 1, 1)])
            .range([actualHeight - margin.bottom, margin.top]);

        // Use square root scale for radius
        const allItems = timelineData.map(d => d.items);
        const allAvgItems = timelineData.map(d => d.exhibitions > 0 ? d.items / d.exhibitions : 0);
        
        const rScale = d3.scaleSqrt()
            .domain([0, Math.max(
                d3.max(allItems) || 1,
                d3.max(allAvgItems) || 1
            )])
            .range([2, 12]); // Min 2px, Max 12px

        return { xScale, yScale, rScale };
    }, [timelineData, actualWidth, actualHeight, margin, minYear, maxYear]);

    useEffect(() => {
        if (!svgRef.current || timelineData.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { xScale, yScale, rScale } = scales;

        // Background
        svg.append('rect')
            .attr('width', actualWidth)
            .attr('height', actualHeight)
            .attr('fill', '#ffffff')
            .attr('stroke', 'none');

        // Group metadata (left side)
        const groupText = svg.append('text')
            .attr('x', margin.left)
            .attr('y', 15)
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text(group.name || 'Unknown Group');

        const textWidth = (groupText.node() as SVGTextElement)?.getBBox().width || 250;

        // Underline
        svg.append('line')
            .attr('x1', margin.left)
            .attr('x2', margin.left + textWidth)
            .attr('y1', 18)
            .attr('y2', 18)
            .attr('stroke', 'black')
            .attr('stroke-width', 1);

        svg.append('text')
            .attr('x', margin.left)
            .attr('y', 42)
            .attr('font-size', '10px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text(`${timelineData.filter(d => d.exhibitions > 0).length} years active | ${timelineData.reduce((sum, d) => sum + d.items, 0)} artworks`);

        // Line path
        const lineGenerator = d3.line<{year: number, exhibitions: number, items: number}>()
            .curve(d3.curveMonotoneX)
            .x(d => xScale(d.year))
            .y(d => yScale(d.exhibitions));

        svg.append('path')
            .datum(timelineData)
            .attr('d', lineGenerator)
            .attr('stroke', 'black')
            .attr('stroke-width', 1.5)
            .attr('fill', 'none');

        // Axes
        const xAxis = d3.axisBottom(xScale)
            .tickFormat(d3.format('d'))
            .tickSize(-innerHeight)
            .tickPadding(10);
            
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d3.format('d'))
            .ticks(5)
            .tickSize(-innerWidth)
            .tickPadding(10);

        // X-axis
        svg.append('g')
            .attr('transform', `translate(0, ${actualHeight - margin.bottom})`)
            .call(xAxis)
            .selectAll('.tick line')
            .attr('stroke', 'black')
            .attr('stroke-opacity', 0.15)
            .attr('stroke-width', 0.5);

        svg.select('.domain').remove();

        // Y-axis
        svg.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(yAxis)
            .selectAll('.tick line')
            .attr('stroke', 'black')
            .attr('stroke-opacity', 0.15)
            .attr('stroke-width', 0.5);

        svg.selectAll('.domain').remove();

        // Y-axis label
        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -(actualHeight / 2))
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Exhibitions');

        // X-axis label
        svg.append('text')
            .attr('x', margin.left + innerWidth / 2)
            .attr('y', actualHeight - margin.bottom + 35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Year');

        // Legend (centered at year 1910)
        const centerX = xScale(1910);
        const legendY = 20;
        const itemSpacing = 100;
        
        const totalWidth = itemSpacing;
        let currentX = centerX - (totalWidth / 2);
        
        // Total Artworks indicator (black circle)
        svg.append('circle')
            .attr('cx', currentX)
            .attr('cy', legendY)
            .attr('r', 4)
            .attr('fill', 'black');
            
        svg.append('text')
            .attr('x', currentX)
            .attr('y', legendY + 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Total Artworks');

        currentX += itemSpacing;

        // Average Artworks/Exhibition indicator (white circle with black border)
        svg.append('circle')
            .attr('cx', currentX)
            .attr('cy', legendY)
            .attr('r', 4)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
            
        svg.append('text')
            .attr('x', currentX)
            .attr('y', legendY + 15)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Avg Artworks/Exhib.');

        // Top semi-circles (absolute items) - solid black
        svg.selectAll('.abs-half-circle')
            .data(timelineData)
            .enter()
            .append('path')
            .attr('class', 'abs-half-circle')
            .attr('fill', 'black')
            .attr('stroke', 'none')
            .attr('d', d => {
                const outerRadius = d.items === 0 ? 0 : rScale(d.items);
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: -Math.PI,
                    endAngle: 0
                }) as string;
            })
            .attr('transform', d => `translate(${xScale(d.year)}, ${yScale(d.exhibitions)})`)
            .style('cursor', 'pointer')
            .on('mouseenter', function(event, d) {
                if (d.items === 0) return;
                
                const x = event.clientX;
                const y = event.clientY;
                
                // Add year highlighting to timeline
                const yearX = xScale(d.year);
                svg.selectAll('.hover-line').remove();
                svg.append('line')
                    .attr('class', 'hover-line')
                    .attr('x1', yearX)
                    .attr('x2', yearX)
                    .attr('y1', margin.top)
                    .attr('y2', actualHeight - margin.bottom)
                    .attr('stroke', '#ff6b35')
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '8,4')
                    .attr('opacity', 0.8);
                
                // Notify ego network
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(d.year);
                }
                
                // Remove existing tooltips
                d3.selectAll('.timeline-tooltip').remove();
                
                // Create tooltip
                d3.select('body').append('div')
                    .attr('class', 'timeline-tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${x + 15}px`)
                    .style('top', `${y - 10}px`)
                    .style('z-index', '1000')
                    .style('max-width', '200px')
                    .html(`
                        <p><b>${group.name || 'Unknown Group'}</b></p>
                        <p>Year: ${d.year}</p>
                        <p>Total Artworks: ${d.items}</p>
                        <p>Exhibitions: ${d.exhibitions}</p>
                    `);
            })
            .on('mousemove', function(event) {
                const x = event.clientX;
                const y = event.clientY;
                
                d3.selectAll('.timeline-tooltip')
                    .style('left', `${x + 15}px`)
                    .style('top', `${y - 10}px`);
            })
            .on('mouseleave', function() {
                svg.selectAll('.hover-line').remove();
                
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(null);
                }
                
                d3.selectAll('.timeline-tooltip').remove();
            });

        // Bottom semi-circles (average items) - white with black outline
        svg.selectAll('.avg-half-circle')
            .data(timelineData)
            .enter()
            .append('path')
            .attr('class', 'avg-half-circle')
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .attr('d', d => {
                const avgItems = d.exhibitions > 0 ? d.items / d.exhibitions : 0;
                const outerRadius = isNaN(avgItems) ? 0 : rScale(avgItems);
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: Math.PI,
                    endAngle: 0
                }) as string;
            })
            .attr('transform', d => `translate(${xScale(d.year)}, ${yScale(d.exhibitions)})`)
            .style('cursor', 'pointer')
            .on('mouseenter', function(event, d) {
                if (d.exhibitions === 0) return;
                
                const x = event.clientX;
                const y = event.clientY;
                const avgItems = d.exhibitions > 0 ? d.items / d.exhibitions : 0;
                
                // Add year highlighting to timeline
                const yearX = xScale(d.year);
                svg.selectAll('.hover-line').remove();
                svg.append('line')
                    .attr('class', 'hover-line')
                    .attr('x1', yearX)
                    .attr('x2', yearX)
                    .attr('y1', margin.top)
                    .attr('y2', actualHeight - margin.bottom)
                    .attr('stroke', '#ff6b35')
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '8,4')
                    .attr('opacity', 0.8);
                
                // Notify ego network
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(d.year);
                }
                
                // Remove existing tooltips
                d3.selectAll('.timeline-tooltip').remove();
                
                // Create tooltip
                d3.select('body').append('div')
                    .attr('class', 'timeline-tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${x + 15}px`)
                    .style('top', `${y - 10}px`)
                    .style('z-index', '1000')
                    .style('max-width', '200px')
                    .html(`
                        <p><b>${group.name || 'Unknown Group'}</b></p>
                        <p>Year: ${d.year}</p>
                        <p>Avg Artworks/Exhibition: ${avgItems.toFixed(1)}</p>
                        <p>Exhibitions: ${d.exhibitions}</p>
                    `);
            })
            .on('mousemove', function(event) {
                const x = event.clientX;
                const y = event.clientY;
                
                d3.selectAll('.timeline-tooltip')
                    .style('left', `${x + 15}px`)
                    .style('top', `${y - 10}px`);
            })
            .on('mouseleave', function() {
                svg.selectAll('.hover-line').remove();
                
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(null);
                }
                
                d3.selectAll('.timeline-tooltip').remove();
            });

    }, [timelineData, actualWidth, actualHeight, scales, group, onEgoNetworkHover]);

    // Handle highlightedYear from ego network - show timeline line for specific year
    useEffect(() => {
        if (!svgRef.current || !scales.xScale) return;

        const svg = d3.select(svgRef.current);
        
        // Remove any existing ego network highlight line
        svg.selectAll('.ego-network-line').remove();

        // Show line if ego network is hovering a year
        if (highlightedYear !== null && highlightedYear !== undefined) {
            const yearX = scales.xScale(highlightedYear);
            
            svg.append('line')
                .attr('class', 'ego-network-line')
                .attr('x1', yearX)
                .attr('x2', yearX)
                .attr('y1', margin.top)
                .attr('y2', actualHeight - margin.bottom)
                .attr('stroke', '#ff6b35')
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '8,4')
                .attr('opacity', 0.8)
                .style('pointer-events', 'none');
        }
    }, [highlightedYear, scales, actualHeight, margin]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clean up any tooltips and gridlines when component unmounts
            d3.selectAll('.timeline-tooltip').remove();
            if (svgRef.current) {
                const svg = d3.select(svgRef.current);
                svg.selectAll('.hover-line').remove();
                svg.selectAll('.ego-network-line').remove();
            }
        };
    }, []);

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
