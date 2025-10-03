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
    highlightedYear?: number | null;
    onEgoNetworkYearHighlight?: number | null; // Match parent component's prop name
    onEgoNetworkHover?: (year: number | null) => void;
    className?: string;
}

const ArtistTimeline: React.FC<ArtistTimelineProps> = ({
    artist,
    exhibitionsList,
    compareArtist,
    width = 800,
    height: propHeight = 150,
    onYearHover,
    highlightedYear,
    onEgoNetworkYearHighlight,
    onEgoNetworkHover,
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
    const compareArtistHeight = compareArtist ? 30 : 0;
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
    const margin = { top: 40, bottom: 30, left: 60, right: 60 }; // Reduced margins for more compact display
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

    // Process compare artist data using the same logic as main artist
    const compareTimelineData = useMemo(() => {
        if (!compareArtist || !compareArtist.exhibitedAtExhibitions) return [];
        
        console.log('=== PROCESSING COMPARE ARTIST DATA ===');
        console.log('Compare artist:', compareArtist.sortname);
        console.log('Compare exhibitions:', compareArtist.exhibitedAtExhibitions.length);
        
        // Process compare artist's exhibitions the same way as the main artist
        const exhibitionsPerYear = new Map<number, Set<number>>();
        const itemsPerYear = new Map<number, number>();
        
        compareArtist.exhibitedAtExhibitions.forEach((exhibition: any) => {
            const year = +exhibition.startyear;
            if (year >= minYear && year <= maxYear) {
                // Filter items to only include those created by the compare artist
                const itemsByCompareArtist = exhibition.exhibitsItems?.filter((item: any) => 
                    item.artistsCreated?.find((a: any) => a.id === compareArtist.id)
                ).length || 0;
                
                // Only count exhibitions and items if the artist actually has items in this exhibition
                if (itemsByCompareArtist > 0) {
                    if (!exhibitionsPerYear.has(year)) {
                        exhibitionsPerYear.set(year, new Set());
                    }
                    exhibitionsPerYear.get(year)?.add(exhibition.id);
                    
                    itemsPerYear.set(year, (itemsPerYear.get(year) || 0) + itemsByCompareArtist);
                }
            }
        });

        // Create data with missing years filled in
        const dataWithMissingYears = [];
        for (let year = minYear; year <= maxYear; year++) {
            const exhibitions = exhibitionsPerYear.get(year)?.size || 0;
            const items = itemsPerYear.get(year) || 0;
            dataWithMissingYears.push({ year, exhibitions, items });
        }
        
        console.log('Compare timeline data processed:', dataWithMissingYears.filter(d => d.exhibitions > 0));
        console.log('=== END COMPARE PROCESSING ===');
        
        return dataWithMissingYears;
    }, [compareArtist, minYear, maxYear]);

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

        // Compare artist metadata (top right) - only show when real compare artist exists
        if (compareArtist) {
            const compareArtistX = containerWidth - margin.right; // Align with end of timeline
            
            const compareArtistText = svg.append('text')
                .attr('x', compareArtistX)
                .attr('y', 25)
                .attr('font-size', '16px')
                .attr('font-weight', 'bold')
                .attr('fill', 'black')
                .attr('font-family', 'Arial, sans-serif')
                .attr('text-anchor', 'end') // Right-align text
                .text(`${compareArtist.sortname || (compareArtist.firstname && compareArtist.lastname ? `${compareArtist.firstname} ${compareArtist.lastname}` : 'Unknown')} (${compareArtist.birthyear}, ${compareArtist.country})`);

            // Get text width for underline`

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
                .text(`${compareArtist.birthyear} (${compareArtist.birthplace}) - ${compareArtist.deathyear} (${compareArtist.deathplace})`);

            svg.append('text')
                .attr('x', compareArtistX)
                .attr('y', 60)
                .attr('font-size', '12px')
                .attr('fill', 'black')
                .attr('font-family', 'Arial, sans-serif')
                .attr('text-anchor', 'end') // Right-align text
                .text(`${compareTimelineData.filter(d => d.exhibitions > 0).length} exhibitions | ${compareTimelineData.reduce((sum, d) => sum + d.items, 0)} artworks`);
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
        if (compareTimelineData && compareTimelineData.length > 0) {
            console.log('Drawing compare line for', compareTimelineData.length, 'points');
            
            svg.append('path')
                .datum(compareTimelineData)
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
        if (compareArtist) {
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
                .text(`${compareArtist.sortname} (${compareTimelineData.filter(d => d.exhibitions > 0).length})`);
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

        // Co-exhibition bars - show years when both artists exhibited together in the SAME exhibitions
        // Render these before glyphs so they appear in the background
        if (compareTimelineData && compareTimelineData.length > 0 && compareArtist) {
            console.log('Drawing co-exhibition bars for shared exhibitions');
            
            // Find exhibitions where BOTH artists have items (actual co-exhibitions)
            const sharedExhibitions: { exhibitionId: number, year: number, count: number }[] = [];
            
            exhibitionsList.forEach(exhibition => {
                const year = +exhibition.startyear;
                
                // Check if main artist has items in this exhibition
                const mainArtistItems = exhibition.exhibitsItems?.filter(item => 
                    item.artistsCreated?.some(artist_created => artist_created.id === artist.id)
                )?.length || 0;
                
                // Check if compare artist has items in this exhibition
                const compareArtistItems = exhibition.exhibitsItems?.filter(item => 
                    item.artistsCreated?.some(artist_created => artist_created.id === compareArtist.id)
                )?.length || 0;
                
                // If both artists have items in this exhibition, it's a true co-exhibition
                if (mainArtistItems > 0 && compareArtistItems > 0) {
                    sharedExhibitions.push({
                        exhibitionId: +exhibition.id,
                        year: year,
                        count: 1 // Each shared exhibition counts as 1
                    });
                }
            });
            
            // Group shared exhibitions by year and count them
            const coExhibitionsByYear = new Map<number, number>();
            sharedExhibitions.forEach(shared => {
                coExhibitionsByYear.set(
                    shared.year, 
                    (coExhibitionsByYear.get(shared.year) || 0) + shared.count
                );
            });
            
            // Convert to array format for D3
            const coExhibitionData = Array.from(coExhibitionsByYear.entries()).map(([year, count]) => ({
                year,
                sharedExhibitions: count
            }));
            
            console.log('Shared exhibitions by year:', coExhibitionData);
            
            // Draw bars for co-exhibition years (only where they actually co-exhibited)
            svg.selectAll('.co-exhibition-bar')
                .data(coExhibitionData)
                .enter()
                .append('rect') // Use regular append, positioned before glyphs
                .attr('class', 'co-exhibition-bar')
                .attr('x', (d: any) => xScale(d.year) - 12) // Wider bars - 24px width
                .attr('y', (d: any) => yScale(d.sharedExhibitions)) // Start from the shared exhibition count
                .attr('width', 24) // Wider bars
                .attr('height', (d: any) => yScale(0) - yScale(d.sharedExhibitions)) // Height corresponds to number of shared exhibitions
                .attr('fill', 'yellow') // Yellow color
                .attr('opacity', 0.3) // Lower opacity for background effect
                .style('pointer-events', 'none'); // Don't interfere with other interactions
        }

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
            .on('mouseenter', function(event, d) {
                if (d.items === 0) return; // No tooltip for empty data
                
                const x = event.clientX;
                const y = event.clientY;
                
                // Add year highlighting functionality to glyph hover
                const yearX = xScale(d.year);
                svg.selectAll('.hover-line').remove(); // Remove existing lines first
                svg.append('line')
                    .attr('class', 'hover-line')
                    .attr('x1', yearX)
                    .attr('x2', yearX)
                    .attr('y1', margin.top)
                    .attr('y2', height - margin.bottom)
                    .attr('stroke', '#ff6b35')
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '8,4')
                    .attr('opacity', 0.8);
                
                // Notify ego network to highlight corresponding year ring (only once)
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(d.year);
                }
                
                // Remove any existing tooltips first
                d3.selectAll('body > div').filter(function() {
                    return d3.select(this).style('position') === 'absolute' && 
                           d3.select(this).style('background-color') === 'black';
                }).remove();
                
                // Create tooltip with ego network styling
                const tooltip = d3.select('body').append('div')
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
                        <p><b>${artist.sortname}</b></p>
                        <p>Year: ${d.year}</p>
                        <p>Total Artworks: ${d.items}</p>
                        <p>Exhibitions: ${d.exhibitions}</p>
                    `);
            })
            .on('mousemove', function(event, d) {
                // Update tooltip position on mouse move without recreating line
                const x = event.clientX;
                const y = event.clientY;
                
                d3.selectAll('body > div').filter(function() {
                    return d3.select(this).style('position') === 'absolute' && 
                           d3.select(this).style('background-color') === 'black';
                })
                .style('left', `${x + 15}px`)
                .style('top', `${y - 10}px`);
            })
            .on('mouseleave', function() {
                // Remove year highlighting
                svg.selectAll('.hover-line').remove();
                
                // Notify ego network to remove highlight
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(null);
                }
                
                // Remove tooltip
                d3.selectAll('body > div').filter(function() {
                    return d3.select(this).style('position') === 'absolute' && 
                           d3.select(this).style('background-color') === 'black';
                }).remove();
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
            .on('mouseenter', function(event, d) {
                if (d.exhibitions === 0) return; // No tooltip for empty data
                
                const x = event.clientX;
                const y = event.clientY;
                const avgItems = d.exhibitions > 0 ? d.items / d.exhibitions : 0;
                
                // Add year highlighting functionality to glyph hover
                const yearX = xScale(d.year);
                svg.selectAll('.hover-line').remove(); // Remove existing lines first
                svg.append('line')
                    .attr('class', 'hover-line')
                    .attr('x1', yearX)
                    .attr('x2', yearX)
                    .attr('y1', margin.top)
                    .attr('y2', height - margin.bottom)
                    .attr('stroke', '#ff6b35')
                    .attr('stroke-width', 3)
                    .attr('stroke-dasharray', '8,4')
                    .attr('opacity', 0.8);
                
                // Notify ego network to highlight corresponding year ring (only once)
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(d.year);
                }
                
                // Remove any existing tooltips first
                d3.selectAll('body > div').filter(function() {
                    return d3.select(this).style('position') === 'absolute' && 
                           d3.select(this).style('background-color') === 'black';
                }).remove();
                
                // Create tooltip with ego network styling
                const tooltip = d3.select('body').append('div')
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
                        <p><b>${artist.sortname}</b></p>
                        <p>Year: ${d.year}</p>
                        <p>Avg Artworks/Exhibition: ${avgItems.toFixed(1)}</p>
                        <p>Exhibitions: ${d.exhibitions}</p>
                    `);
            })
            .on('mousemove', function(event, d) {
                // Update tooltip position on mouse move without recreating line
                const x = event.clientX;
                const y = event.clientY;
                
                d3.selectAll('body > div').filter(function() {
                    return d3.select(this).style('position') === 'absolute' && 
                           d3.select(this).style('background-color') === 'black';
                })
                .style('left', `${x + 15}px`)
                .style('top', `${y - 10}px`);
            })
            .on('mouseleave', function() {
                // Remove year highlighting
                svg.selectAll('.hover-line').remove();
                
                // Notify ego network to remove highlight
                if (onEgoNetworkHover) {
                    onEgoNetworkHover(null);
                }
                
                // Remove tooltip
                d3.selectAll('body > div').filter(function() {
                    return d3.select(this).style('position') === 'absolute' && 
                           d3.select(this).style('background-color') === 'black';
                }).remove();
            });

        // Compare artist semi-circles if data exists
        if (compareTimelineData && compareTimelineData.length > 0) {
            console.log('Drawing compare semi-circles for', compareTimelineData.length, 'points');
            
            // Compare top semi-circles (absolute items) - gray with dashed outline
            svg.selectAll('.compare-abs-half-circle')
                .data(compareTimelineData)
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
                .style('cursor', 'pointer')
                .on('mouseenter', function(event, d) {
                    if (d.items === 0) return; // No tooltip for empty data
                    
                    const x = event.clientX;
                    const y = event.clientY;
                    
                    // Add year highlighting functionality to glyph hover
                    const yearX = xScale(d.year);
                    svg.selectAll('.hover-line').remove(); // Remove existing lines first
                    svg.append('line')
                        .attr('class', 'hover-line')
                        .attr('x1', yearX)
                        .attr('x2', yearX)
                        .attr('y1', margin.top)
                        .attr('y2', height - margin.bottom)
                        .attr('stroke', '#ff6b35')
                        .attr('stroke-width', 3)
                        .attr('stroke-dasharray', '8,4')
                        .attr('opacity', 0.8);
                    
                    // Notify ego network to highlight corresponding year ring (only once)
                    if (onEgoNetworkHover) {
                        onEgoNetworkHover(d.year);
                    }
                    
                    // Remove any existing tooltips first
                    d3.selectAll('body > div').filter(function() {
                        return d3.select(this).style('position') === 'absolute' && 
                               d3.select(this).style('background-color') === 'black';
                    }).remove();
                    
                    // Create tooltip with ego network styling
                    const tooltip = d3.select('body').append('div')
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
                            <p><b>${compareArtist?.sortname || (compareArtist?.firstname && compareArtist?.lastname ? `${compareArtist.firstname} ${compareArtist.lastname}` : 'Unknown')}</b></p>
                            <p>Year: ${d.year}</p>
                            <p>Total Artworks: ${d.items}</p>
                            <p>Exhibitions: ${d.exhibitions}</p>
                        `);
                })
                .on('mousemove', function(event, d) {
                    // Update tooltip position on mouse move without recreating line
                    const x = event.clientX;
                    const y = event.clientY;
                    
                    d3.selectAll('body > div').filter(function() {
                        return d3.select(this).style('position') === 'absolute' && 
                               d3.select(this).style('background-color') === 'black';
                    })
                    .style('left', `${x + 15}px`)
                    .style('top', `${y - 10}px`);
                })
                .on('mouseleave', function() {
                    // Remove year highlighting
                    svg.selectAll('.hover-line').remove();
                    
                    // Notify ego network to remove highlight
                    if (onEgoNetworkHover) {
                        onEgoNetworkHover(null);
                    }
                    
                    // Remove tooltip
                    d3.selectAll('body > div').filter(function() {
                        return d3.select(this).style('position') === 'absolute' && 
                               d3.select(this).style('background-color') === 'black';
                    }).remove();
                });

            // Compare bottom semi-circles (average items) - light gray with dashed outline
            svg.selectAll('.compare-avg-half-circle')
                .data(compareTimelineData)
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
                .style('cursor', 'pointer')
                .on('mouseenter', function(event, d) {
                    if (d.exhibitions === 0) return; // No tooltip for empty data
                    
                    const x = event.clientX;
                    const y = event.clientY;
                    const avgItems = d.exhibitions > 0 ? d.items / d.exhibitions : 0;
                    
                    // Add year highlighting functionality to glyph hover
                    const yearX = xScale(d.year);
                    svg.selectAll('.hover-line').remove(); // Remove existing lines first
                    svg.append('line')
                        .attr('class', 'hover-line')
                        .attr('x1', yearX)
                        .attr('x2', yearX)
                        .attr('y1', margin.top)
                        .attr('y2', height - margin.bottom)
                        .attr('stroke', '#ff6b35')
                        .attr('stroke-width', 3)
                        .attr('stroke-dasharray', '8,4')
                        .attr('opacity', 0.8);
                    
                    // Notify ego network to highlight corresponding year ring (only once)
                    if (onEgoNetworkHover) {
                        onEgoNetworkHover(d.year);
                    }
                    
                    // Remove any existing tooltips first
                    d3.selectAll('body > div').filter(function() {
                        return d3.select(this).style('position') === 'absolute' && 
                               d3.select(this).style('background-color') === 'black';
                    }).remove();
                    
                    // Create tooltip with ego network styling
                    const tooltip = d3.select('body').append('div')
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
                            <p><b>${compareArtist?.sortname || (compareArtist?.firstname && compareArtist?.lastname ? `${compareArtist.firstname} ${compareArtist.lastname}` : 'Unknown')}</b></p>
                            <p>Year: ${d.year}</p>
                            <p>Avg Artworks/Exhibition: ${avgItems.toFixed(1)}</p>
                            <p>Exhibitions: ${d.exhibitions}</p>
                        `);
                })
                .on('mousemove', function(event, d) {
                    // Update tooltip position on mouse move without recreating line
                    const x = event.clientX;
                    const y = event.clientY;
                    
                    d3.selectAll('body > div').filter(function() {
                        return d3.select(this).style('position') === 'absolute' && 
                               d3.select(this).style('background-color') === 'black';
                    })
                    .style('left', `${x + 15}px`)
                    .style('top', `${y - 10}px`);
                })
                .on('mouseleave', function() {
                    // Remove year highlighting
                    svg.selectAll('.hover-line').remove();
                    
                    // Notify ego network to remove highlight
                    if (onEgoNetworkHover) {
                        onEgoNetworkHover(null);
                    }
                    
                    // Remove tooltip
                    d3.selectAll('body > div').filter(function() {
                        return d3.select(this).style('position') === 'absolute' && 
                               d3.select(this).style('background-color') === 'black';
                    }).remove();
                });
        }


    }, [timelineData, compareTimelineData, scales, containerWidth, height, margin, onYearHover, exhibitionsList, onEgoNetworkHover]);

    useEffect(() => {
        drawTimeline();
    }, [drawTimeline]);

    // Handle ego network hover - show timeline line for specific year
    useEffect(() => {
        if (!svgRef.current || !scales.xScale) return;

        const svg = d3.select(svgRef.current);
        
        // Remove any existing ego network highlight line
        svg.selectAll('.ego-network-line').remove();

        // Show line if ego network is hovering a year
        if (onEgoNetworkYearHighlight !== null && onEgoNetworkYearHighlight !== undefined) {
            const yearX = scales.xScale(onEgoNetworkYearHighlight);
            
            svg.append('line')
                .attr('class', 'ego-network-line')
                .attr('x1', yearX)
                .attr('x2', yearX)
                .attr('y1', margin.top)
                .attr('y2', height - margin.bottom)
                .attr('stroke', '#ff6b35')
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '8,4')
                .attr('opacity', 0.8)
                .style('pointer-events', 'none');
        }
    }, [onEgoNetworkYearHighlight, scales, height, margin]);

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