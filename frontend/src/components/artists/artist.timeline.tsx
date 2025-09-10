import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { Item } from '../../models/item.model';

interface ArtistTimelineProps {
    artist: Artist;
    exhibitionsList: Exhibition[];
    compareArtist?: Artist | null;
    width?: number;
    height?: number;
    onYearHover?: (year: number, exhibitions: Exhibition[]) => void;
    className?: string;
}

const ArtistTimeline: React.FC<ArtistTimelineProps> = ({
    artist,
    exhibitionsList,
    compareArtist,
    width = 800,
    height: propHeight = 300,
    onYearHover,
    className = "w-full h-full"
}) => {
    console.log('=== ARTIST TIMELINE RENDER ===');
    console.log('Artist:', artist.sortname, 'ID:', artist.id);
    console.log('Compare Artist:', compareArtist?.sortname || 'None');
    console.log('Exhibitions received:', exhibitionsList?.length || 0);
    console.log('Raw exhibitionsList:', exhibitionsList);
    
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [containerWidth, setContainerWidth] = useState(width);

    // Dynamic height based on whether we have a compare artist
    const compareArtistHeight = compareArtist ? 60 : 0;
    const height = propHeight + compareArtistHeight;

    // Update width based on container size
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerWidth(rect.width || width);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [width]);

    // Use responsive width
    const actualWidth = containerWidth;
    const actualHeight = height;

    // Constants from original - adjust margins for responsive design
    const margin = { top: 80, bottom: 60, left: 60, right: 60 }; // Reduced bottom margin for cleaner legend
    const minYear = 1905;
    const maxYear = 1915;
    const innerWidth = actualWidth - margin.left - margin.right;
    const innerHeight = actualHeight - margin.top - margin.bottom;

    // Process timeline data using EXACT original logic
    const timelineData = useMemo(() => {
        console.log('=== PROCESSING TIMELINE DATA ===');
        
        if (!exhibitionsList || exhibitionsList.length === 0) {
            console.log('No exhibitions data available');
            return [];
        }

        // EXACT copy from original: calculate exhibitions per year
        const exhibitionsPerYear = new Map<number, Set<number>>();
        const itemsPerYear = new Map<number, number>();
        
        console.log('Processing exhibitions...');
        exhibitionsList.forEach((exhibition: Exhibition, index: number) => {
            console.log(`Exhibition ${index + 1}:`, {
                id: exhibition.id,
                title: exhibition.title,
                year: exhibition.startyear,
                items: exhibition.exhibitsItems?.length || 0
            });
            
            const year = +exhibition.startyear;
            if (exhibitionsPerYear.has(year)) {
                exhibitionsPerYear.get(year)?.add(+exhibition.id);
            } else {
                exhibitionsPerYear.set(year, new Set<number>([+exhibition.id]));
            }
        });

        console.log('Processing items...');
        exhibitionsList.forEach((exhibition: Exhibition) => {
            const year = +exhibition.startyear;
            const itemsByArtist = exhibition.exhibitsItems?.filter((item: Item) => 
                item.artistsCreated?.find((a: Artist) => a.id === artist.id)
            ).length || 0;
            
            console.log(`Year ${year}: ${itemsByArtist} items by artist`);
            
            if (itemsPerYear.has(year)) {
                const count = itemsPerYear.get(year) || 0;
                itemsPerYear.set(year, count + itemsByArtist);
            } else {
                itemsPerYear.set(year, itemsByArtist);
            }
        });

        // Convert to data arrays (EXACT copy from original)
        const exhibitionData = [...exhibitionsPerYear].map(([year, set]) => ({ 
            year, 
            count: set.size 
        })).sort((a, b) => a.year - b.year);

        const itemsData = [...itemsPerYear].map(([year, count]) => ({ 
            year, 
            count 
        })).sort((a, b) => a.year - b.year);

        // Merge arrays (EXACT copy from original)
        const data = exhibitionData.map((exhibition: { year: number, count: number }) => {
            const items = itemsData.find((item: { year: number, count: number }) => 
                item.year === exhibition.year
            );
            if (items) {
                return { year: exhibition.year, exhibitions: exhibition.count, items: items.count };
            } else {
                return { year: exhibition.year, exhibitions: exhibition.count, items: 0 };
            }
        });

        // Add missing years (EXACT copy from original)
        const years: Array<number> = Array.from(Array(maxYear - minYear + 1).keys()).map((i) => i + minYear);
        const dataWithMissingYears = years.map((year: number) => {
            const yearData = data.find((d: { year: number, exhibitions: number, items: number }) => 
                d.year === year
            );
            if (yearData) {
                return yearData;
            } else {
                return { year, exhibitions: 0, items: 0 };
            }
        });

        console.log('Final timeline data:', dataWithMissingYears);
        console.log('Years with exhibitions:', dataWithMissingYears.filter(d => d.exhibitions > 0));
        console.log('=== END PROCESSING ===');

        return dataWithMissingYears;
    }, [exhibitionsList, artist.id, minYear, maxYear]);

    // PLACEHOLDER: Create mock compare artist data for testing
    const mockCompareTimelineData = useMemo(() => {
        console.log('=== CREATING PLACEHOLDER COMPARE DATA ===');
        
        // Create simplified mock data directly without type issues
        const years: Array<number> = Array.from(Array(maxYear - minYear + 1).keys()).map((i) => i + minYear);
        const mockData = years.map((year: number) => {
            // Add some mock exhibitions at specific years
            if (year === 1906) return { year, exhibitions: 2, items: 3 };
            if (year === 1908) return { year, exhibitions: 1, items: 1 };
            if (year === 1910) return { year, exhibitions: 1, items: 3 };
            if (year === 1912) return { year, exhibitions: 1, items: 2 };
            if (year === 1913) return { year, exhibitions: 1, items: 1 };
            return { year, exhibitions: 0, items: 0 };
        });

        console.log('Mock compare timeline data:', mockData);
        console.log('=== END COMPARE PROCESSING ===');

        return mockData;
    }, [minYear, maxYear]);

    // Process compare artist data using the same logic
    const compareTimelineData = useMemo(() => {
        if (!compareArtist) return [];
        
        console.log('=== PROCESSING COMPARE ARTIST DATA ===');
        console.log('Compare artist:', compareArtist.sortname);
        
        // For now, let's create a temporary compare artist with some test data
        // We'll use a modified version of the base artist's data to simulate comparison
        const testCompareData = timelineData.map(d => ({
            year: d.year,
            exhibitions: Math.max(0, d.exhibitions - 1), // Slightly different exhibition count
            items: Math.max(0, Math.floor(d.items * 0.7)) // Different item count
        }));
        
        console.log('Compare timeline data:', testCompareData);
        console.log('=== END COMPARE PROCESSING ===');
        
        return testCompareData;
    }, [compareArtist, timelineData]);

    // Mock compare artist data for metadata display
    const mockCompareArtist = {
        sortname: "Test Artist",
        birthyear: 1866,
        deathyear: 1944,
        birthplace: "Test City",
        deathplace: "Test City 2",
        country: "Test Country"
    };

    // Scales
    const scales = useMemo(() => {
        const xScale = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([margin.left, containerWidth - margin.right]);

        // Calculate extents for both base and compare data
        const allExhibitionCounts = [
            ...timelineData.map(d => d.exhibitions),
            ...(compareTimelineData?.map(d => d.exhibitions) || [])
        ];
        const yExtent = d3.extent(allExhibitionCounts) as [number, number];
        const yScale = d3.scaleLinear()
            .domain([0, Math.max(yExtent[1] || 1, 1)])
            .range([height - margin.bottom, margin.top]);

        // Calculate extents for radius scaling
        const allItems = [
            ...timelineData.map(d => d.items),
            ...(compareTimelineData?.map(d => d.items) || [])
        ];
        const allAvgItems = [
            ...timelineData.map(d => d.exhibitions > 0 ? d.items / d.exhibitions : 0),
            ...(compareTimelineData?.map(d => d.exhibitions > 0 ? d.items / d.exhibitions : 0) || [])
        ];
        
        const rScale = d3.scalePow()
            .exponent(0.5)
            .domain([0, Math.max(
                d3.max(allItems) || 1,
                d3.max(allAvgItems) || 1
            )])
            .range([0, 20]);

        return { xScale, yScale, rScale };
    }, [timelineData, compareTimelineData, width, height, margin, minYear, maxYear]);

    // Draw timeline
    const drawTimeline = useCallback(() => {
        if (!svgRef.current || timelineData.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const { xScale, yScale, rScale } = scales;

        // Background - clean white
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#ffffff')
            .attr('stroke', 'none');

        // Main artist metadata (left side)
        const mainArtistText = svg.append('text')
            .attr('x', margin.left)
            .attr('y', 25)
            .attr('font-size', '16px')
            .attr('font-weight', 'bold')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text(`${artist.sortname} (${artist.birthyear || ''}, ${artist.country || 'RU'})`);

        // Get text width for underline
        const mainTextWidth = (mainArtistText.node() as SVGTextElement)?.getBBox().width || 250;

        // Underline for main artist
        svg.append('line')
            .attr('x1', margin.left)
            .attr('x2', margin.left + mainTextWidth)
            .attr('y1', 28)
            .attr('y2', 28)
            .attr('stroke', 'black')
            .attr('stroke-width', 1);

        svg.append('text')
            .attr('x', margin.left)
            .attr('y', 45)
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text(`${artist.deathyear ? `${artist.birthyear} (${artist.birthplace || 'Moscow'}) - ${artist.deathyear} (${artist.deathplace || 'Neuilly-sur-Seine'})` : ''}`);

        svg.append('text')
            .attr('x', margin.left)
            .attr('y', 60)
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text(`${exhibitionsList.length} exhibitions | ${timelineData.reduce((sum, d) => sum + d.items, 0)} artworks`);

        // Compare artist metadata (top right) - show mockCompareArtist for testing
        const shouldShowCompareArtist = compareArtist || true; // Always show for testing
        const compareArtistToShow = compareArtist || mockCompareArtist;
        
        if (shouldShowCompareArtist) {
            const compareArtistX = containerWidth - margin.right; // Align with end of timeline
            
            const compareArtistText = svg.append('text')
                .attr('x', compareArtistX)
                .attr('y', 25)
                .attr('font-size', '16px')
                .attr('font-weight', 'bold')
                .attr('fill', 'black')
                .attr('font-family', 'Arial, sans-serif')
                .attr('text-anchor', 'end') // Right-align text
                .text(`${compareArtistToShow.sortname} (${compareArtistToShow.birthyear}, ${compareArtistToShow.country || 'Test Country'})`);

            // Get text width for underline
            const compareTextWidth = (compareArtistText.node() as SVGTextElement)?.getBBox().width || 200;

            // Dashed underline for compare artist
            svg.append('line')
                .attr('x1', compareArtistX - compareTextWidth) // Start line to fit text width
                .attr('x2', compareArtistX)                    // End at the text position
                .attr('y1', 28)
                .attr('y2', 28)
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '3,3');

            svg.append('text')
                .attr('x', compareArtistX)
                .attr('y', 45)
                .attr('font-size', '12px')
                .attr('fill', 'black')
                .attr('font-family', 'Arial, sans-serif')
                .attr('text-anchor', 'end') // Right-align text
                .text(`${compareArtistToShow.birthyear} (${compareArtistToShow.birthplace || 'Test City'}) - ${compareArtistToShow.deathyear || 1944} (${compareArtistToShow.deathplace || 'Test City 2'})`);

            svg.append('text')
                .attr('x', compareArtistX)
                .attr('y', 60)
                .attr('font-size', '12px')
                .attr('fill', 'black')
                .attr('font-family', 'Arial, sans-serif')
                .attr('text-anchor', 'end') // Right-align text
                .text(`${mockCompareTimelineData.filter(d => d.exhibitions > 0).length} exhibitions | ${mockCompareTimelineData.reduce((sum, d) => sum + d.items, 0)} artworks`);
        }

        // Line path - clean black line
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

        // Compare artist line path - dashed gray line
        if (mockCompareTimelineData && mockCompareTimelineData.length > 0) {
            console.log('Drawing compare line for', mockCompareTimelineData.length, 'points');
            
            svg.append('path')
                .datum(mockCompareTimelineData)
                .attr('d', lineGenerator)
                .attr('stroke', 'black')
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', '3, 3')  // Dashed line
                .attr('fill', 'none');
        }

        // Axes with clean styling
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
            .attr('transform', `translate(0, ${height - margin.bottom})`)
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
            .attr('x', -(height / 2))
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Exhibitions');

        // X-axis label - positioned just under the x-axis with more spacing
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height - margin.bottom + 35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Year');

        // Legend row - positioned under the Year label with proper spacing
        const legendY = height - margin.bottom + 50;
        const legendSpacing = width / 6; // Divide width into 6 sections for even spacing
        
        // 1. Base artist legend
        const baseX = legendSpacing;
        svg.append('line')
            .attr('x1', baseX - 15)
            .attr('x2', baseX)
            .attr('y1', legendY)
            .attr('y2', legendY)
            .attr('stroke', 'black')
            .attr('stroke-width', 2);
            
        svg.append('text')
            .attr('x', baseX + 5)
            .attr('y', legendY + 4)
            .attr('font-size', '10px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text(`${artist?.sortname || 'Artist'} (${exhibitionsList.length})`);

        // 2. Compare artist legend (if exists)
        if (shouldShowCompareArtist) {
            const compareX = legendSpacing * 2.5;
            svg.append('line')
                .attr('x1', compareX - 15)
                .attr('x2', compareX)
                .attr('y1', legendY)
                .attr('y2', legendY)
                .attr('stroke', 'black')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '3,2');
                
            svg.append('text')
                .attr('x', compareX + 5)
                .attr('y', legendY + 4)
                .attr('font-size', '10px')
                .attr('fill', 'black')
                .attr('font-family', 'Arial, sans-serif')
                .text(`${compareArtistToShow.sortname} (5)`);
        }

        // 3. Group shows indicator (black circle)
        const groupX = legendSpacing * 4;
        svg.append('circle')
            .attr('cx', groupX - 5)
            .attr('cy', legendY)
            .attr('r', 4)
            .attr('fill', 'black');
            
        svg.append('text')
            .attr('x', groupX + 5)
            .attr('y', legendY + 4)
            .attr('font-size', '10px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Group shows');

        // 4. Solo shows indicator (white circle with black border)
        const soloX = legendSpacing * 5;
        svg.append('circle')
            .attr('cx', soloX - 5)
            .attr('cy', legendY)
            .attr('r', 4)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', 1);
            
        svg.append('text')
            .attr('x', soloX + 5)
            .attr('y', legendY + 4)
            .attr('font-size', '10px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .text('Solo shows');

        // 5. Help icon with tooltip - positioned at the far right
        const helpX = legendSpacing * 5.8;
        svg.append('circle')
            .attr('cx', helpX)
            .attr('cy', legendY)
            .attr('r', 8)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', 1)
            .style('cursor', 'pointer')
            .on('mouseenter', function() {
                // Show tooltip on hover
                const tooltip = svg.append('g').attr('class', 'help-tooltip');
                
                tooltip.append('rect')
                    .attr('x', helpX - 100)
                    .attr('y', legendY - 35)
                    .attr('width', 200)
                    .attr('height', 18)
                    .attr('fill', 'black')
                    .attr('rx', 2);
                    
                tooltip.append('text')
                    .attr('x', helpX)
                    .attr('y', legendY - 22)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .attr('fill', 'white')
                    .attr('font-family', 'Arial, sans-serif')
                    .text('Timeline shows exhibitions over time');
            })
            .on('mouseleave', function() {
                svg.selectAll('.help-tooltip').remove();
            });
            
        svg.append('text')
            .attr('x', helpX)
            .attr('y', legendY + 4)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', 'black')
            .attr('font-family', 'Arial, sans-serif')
            .attr('font-weight', 'bold')
            .style('cursor', 'pointer')
            .text('?');

        // Top semi-circles (absolute items) - solid black like in screenshot
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
            .on('mouseover', function(event, d) {
                d3.select(this).attr('fill-opacity', 0.7);
                if (onYearHover) {
                    const yearExhibitions = exhibitionsList.filter(ex => ex.startyear === d.year);
                    onYearHover(d.year, yearExhibitions);
                }
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill-opacity', 1);
            });

        // Bottom semi-circles (average items) - white with black outline like in screenshot
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
            .on('mouseover', function(event, d) {
                d3.select(this).attr('fill', 'white');
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill', 'white');
            });

        // Compare artist semi-circles if data exists
        if (mockCompareTimelineData && mockCompareTimelineData.length > 0) {
            console.log('Drawing compare semi-circles for', mockCompareTimelineData.length, 'points');
            
            // Compare top semi-circles (absolute items) - gray with dashed outline
            svg.selectAll('.compare-abs-half-circle')
                .data(mockCompareTimelineData)
                .enter()
                .append('path')
                .attr('class', 'compare-abs-half-circle')
                .attr('fill', 'black')
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '2, 2')
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
                .style('cursor', 'pointer');

            // Compare bottom semi-circles (average items) - light gray with dashed outline
            svg.selectAll('.compare-avg-half-circle')
                .data(mockCompareTimelineData)
                .enter()
                .append('path')
                .attr('class', 'compare-avg-half-circle')
                .attr('fill', 'white')
                .attr('stroke', 'black')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '2, 2')
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
                .style('cursor', 'pointer');
        }
    }, [timelineData, scales, width, height, margin, onYearHover, exhibitionsList]);

    useEffect(() => {
        drawTimeline();
    }, [drawTimeline]);

    return (
        <div ref={containerRef} className={className} style={{ minHeight: height }}>
            <svg
                ref={svgRef}
                width={width}
                height={height}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default ArtistTimeline;