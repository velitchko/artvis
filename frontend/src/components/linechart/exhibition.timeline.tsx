import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { Exhibition } from '../../models/exhibition.model';

// Types
interface TimelineData {
    year: number;
    exhibitions: number;
    items: number;
}

interface ExhibitionTimelineProps {
    exhibitions: Exhibition[];
    width?: number;
    height?: number;
    onDataPointHover?: (data: TimelineData | null) => void;
    className?: string;
}

interface D3Elements {
    svg?: d3.Selection<any, any, any, any>;
    baseTimeline?: d3.Selection<any, any, any, any>;
    xAxis?: d3.Selection<any, any, any, any>;
    yAxis?: d3.Selection<any, any, any, any>;
    tooltip?: d3.Selection<any, any, any, any>;
    xScale?: d3.ScaleLinear<number, number>;
    yScale?: d3.ScaleLinear<number, number>;
    rScale?: d3.ScalePower<number, number>;
}

// Constants
const YEAR_RANGE = { min: 1905, max: 1915 };
const MARGINS = { top: 30, bottom: 40, left: 40, right: 30 };
const DEFAULT_DIMENSIONS = { width: 500, height: 250 };

// Custom hooks
const useResizeObserver = (elementRef: React.RefObject<HTMLDivElement>) => {
    const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);

    useEffect(() => {
        if (!elementRef.current) return;

        const updateDimensions = () => {
            if (elementRef.current) {
                setDimensions({
                    width: elementRef.current.clientWidth,
                    height: elementRef.current.clientHeight
                });
            }
        };

        updateDimensions();

        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(elementRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    return dimensions;
};

// Utility functions
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

const createTimelineWithMissingYears = (data: TimelineData[]): TimelineData[] => {
    const result: TimelineData[] = [];
    
    for (let year = YEAR_RANGE.min; year <= YEAR_RANGE.max; year++) {
        const existing = data.find(d => d.year === year);
        if (existing) {
            result.push(existing);
        } else {
            result.push({ year, exhibitions: 0, items: 0 });
        }
    }
    
    return result;
};

const ExhibitionTimeline: React.FC<ExhibitionTimelineProps> = ({
    exhibitions,
    width,
    height,
    onDataPointHover,
    className = "w-full h-full"
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const d3ElementsRef = useRef<D3Elements>({});
    const observedDimensions = useResizeObserver(containerRef);
    
    // Use provided dimensions or observed dimensions
    const dimensions = useMemo(() => ({
        width: width || observedDimensions.width,
        height: height || observedDimensions.height
    }), [width, height, observedDimensions]);

    // Process exhibition data
    const timelineData = useMemo(() => {
        console.log('=== PROCESSING TIMELINE DATA ===');
        console.log('Exhibitions list length:', exhibitions.length);
        
        if (!exhibitions.length) {
            console.log('No exhibitions, returning empty array');
            return [];
        }
        
        const processed = processExhibitionData(exhibitions);
        console.log('Processed timeline data:', processed);
        return processed;
    }, [exhibitions]);

    // Initialize timeline SVG and elements
    const initializeTimeline = useCallback(() => {
        console.log('=== INITIALIZE TIMELINE ===');
        console.log('Timeline dimensions:', dimensions);
        
        if (dimensions.width === 0 || dimensions.height === 0) {
            console.log('Invalid dimensions, skipping timeline initialization');
            return;
        }

        // Clear existing timeline
        d3.select(containerRef.current).select('svg').remove();

        const svg = d3.select(containerRef.current)
            .append('svg')
            .attr('width', dimensions.width)
            .attr('height', dimensions.height)
            .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('overflow', 'visible');

        const timelineContainer = svg.append('g')
            .attr('class', 'timeline-container');

        const baseTimeline = timelineContainer
            .append('g')
            .attr('id', 'base-timeline');

        // Setup scales
        const xScale = d3.scaleLinear()
            .range([MARGINS.left, dimensions.width - MARGINS.right]);
            
        const yScale = d3.scaleLinear()
            .range([dimensions.height - MARGINS.bottom, MARGINS.top]);
            
        const rScale = d3.scaleSqrt()
            .range([3, 15]);

        // Setup axes
        const xAxis = svg.append('g')
            .attr('transform', `translate(0, ${dimensions.height - MARGINS.bottom})`)
            .attr('class', 'x-axis');

        const yAxis = svg.append('g')
            .attr('transform', `translate(${MARGINS.left}, 0)`)
            .attr('class', 'y-axis');

        // Add axis labels
        svg.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', dimensions.width / 2)
            .attr('y', dimensions.height - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text('Year');

        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('x', -dimensions.height / 2)
            .attr('y', 15)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .text('Exhibitions');

        // Setup tooltip
        const tooltip = d3.select('body').append('div')
            .attr('class', 'timeline-tooltip')
            .style('position', 'absolute')
            .style('background-color', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('opacity', 0);

        // Store D3 elements
        d3ElementsRef.current = {
            svg,
            baseTimeline,
            xAxis,
            yAxis,
            tooltip,
            xScale,
            yScale,
            rScale
        };

        console.log('Timeline initialized successfully');
    }, [dimensions]);

    // Draw timeline
    const drawTimeline = useCallback(() => {
        console.log('=== DRAW TIMELINE ===');
        console.log('Timeline data:', timelineData);
        
        const { svg, baseTimeline, xScale, yScale, xAxis, yAxis } = d3ElementsRef.current;
        
        console.log('D3 Elements:', { 
            svg: !!svg, 
            baseTimeline: !!baseTimeline, 
            xScale: !!xScale, 
            yScale: !!yScale, 
            xAxis: !!xAxis, 
            yAxis: !!yAxis 
        });
        
        if (!svg || !baseTimeline || !xScale || !yScale || !xAxis || !yAxis) {
            console.log('Missing D3 elements, returning');
            return;
        }
        if (!timelineData.length) {
            console.log('No timeline data, returning');
            return;
        }

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
        
        console.log('Timeline drawn successfully');
    }, [timelineData]);

    // Draw data points
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
            .style('cursor', 'pointer')
            .on('mouseover', (event: MouseEvent, d: TimelineData) => {
                handleDataPointMouseOver(event, d);
                onDataPointHover?.(d);
            })
            .on('mouseout', () => {
                handleDataPointMouseOut();
                onDataPointHover?.(null);
            });
    }, [onDataPointHover]);

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

    // Effects
    useEffect(() => {
        if (dimensions.width > 0 && dimensions.height > 0) {
            initializeTimeline();
        }
    }, [dimensions, initializeTimeline]);

    useEffect(() => {
        if (timelineData.length > 0 && dimensions.width > 0) {
            drawTimeline();
        }
    }, [timelineData, dimensions, drawTimeline]);

    // Cleanup
    useEffect(() => {
        return () => {
            // Clean up tooltip
            d3.select('body').selectAll('.timeline-tooltip').remove();
        };
    }, []);

    return (
        <div ref={containerRef} className={className}>
            {/* SVG will be appended here by D3 */}
        </div>
    );
};

export default ExhibitionTimeline;
