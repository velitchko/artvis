import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import { Group } from '../../models/group.model';
import { Artist } from '../../models/artist.model';
import { countryColors, sexColors } from '../../colors/colors';

interface GroupNetworkProps {
    group: Group;
    links?: any[]; // Not used in ego network, kept for compatibility
    width?: number;
    height?: number;
    coExhibitionCount?: number;
    groupBy?: string;
    highlightedYear?: number | null;
    onYearHover?: (year: number) => void;
    onYearMouseOut?: () => void;
}

// Exhibition data point for each member-year combination
interface MemberExhibitionPoint {
    memberId: number;
    memberName: string;
    year: number;
    count: number; // Number of exhibitions this year
    totalArtworks: number; // Number of artworks exhibited
    member: Artist;
    memberIndex: number; // Position in the circle (0 to n-1)
    group: string; // country or sex for coloring
}

const YEAR_RANGE = { min: 1905, max: 1915 };

const GroupNetwork: React.FC<GroupNetworkProps> = ({
    group,
    width = 600,
    height = 600,
    groupBy = 'country',
    highlightedYear,
    onYearHover,
    onYearMouseOut
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState(width);
    const [containerHeight, setContainerHeight] = useState(height);

    // Update dimensions
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerWidth(rect.width || width);
                setContainerHeight(rect.height || height);
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [width, height]);

    // Process exhibition data for all members across all years
    const exhibitionData = useMemo((): MemberExhibitionPoint[] => {
        const dataPoints: MemberExhibitionPoint[] = [];
        
        group.artistsMemberOf.forEach((member, memberIndex) => {
            // Group member's exhibitions by year
            const exhibitionsByYear = new Map<number, { count: number; artworks: number }>();
            
            member.exhibitedAtExhibitions?.forEach(exhibition => {
                const year = exhibition.startyear;
                if (year && year >= YEAR_RANGE.min && year <= YEAR_RANGE.max) {
                    const existing = exhibitionsByYear.get(year) || { count: 0, artworks: 0 };
                    
                    // Count artworks by this member in this exhibition
                    const artworkCount = exhibition.exhibitsItems?.filter(item => 
                        item.artistsCreated?.some(artist => artist.id === member.id)
                    ).length || 0;
                    
                    exhibitionsByYear.set(year, {
                        count: existing.count + 1,
                        artworks: existing.artworks + artworkCount
                    });
                }
            });

            // Create a data point for each year this member exhibited
            exhibitionsByYear.forEach((data, year) => {
                dataPoints.push({
                    memberId: member.id,
                    memberName: member.sortname,
                    year,
                    count: data.count,
                    totalArtworks: data.artworks,
                    member,
                    memberIndex,
                    group: groupBy === 'sex' ? (member.sex || 'unknown') : (member.country || 'unknown')
                });
            });
        });

        return dataPoints;
    }, [group, groupBy]);

    // Calculate members sorted by name for consistent positioning
    const sortedMembers = useMemo(() => {
        return _.orderBy(group.artistsMemberOf, ['sortname'], ['asc']);
    }, [group]);

    // Get color for a group value
    const getColor = (groupValue: string): string => {
        const colorMap = groupBy === 'sex' ? sexColors : countryColors;
        return colorMap.get(groupValue) || '#999';
    };

    // Render ego network visualization with year rings
    useEffect(() => {
        if (!svgRef.current || sortedMembers.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        const minDimension = Math.min(containerWidth, containerHeight);
        const maxRadius = minDimension * 0.40;
        const minRadius = minDimension * 0.08;
        const labelOffset = minDimension * 0.05;

        // Scales
        const radiusScale = d3.scaleLinear()
            .domain([YEAR_RANGE.min, YEAR_RANGE.max])
            .range([minRadius, maxRadius]);

        const angleScale = d3.scaleLinear()
            .domain([0, sortedMembers.length])
            .range([0, 2 * Math.PI]);

        const nodeSizeScale = d3.scaleSqrt()
            .domain([0, d3.max(exhibitionData, d => d.count) || 10])
            .range([2, 8]);

        // Main container (will be transformed by zoom)
        const g = svg.append('g')
            .attr('id', 'everything')
            .attr('transform', `translate(${centerX},${centerY})`);

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 4]) // Allow zoom from 0.5x to 4x
            .on('zoom', (event) => {
                g.attr('transform', `translate(${centerX},${centerY}) ${event.transform}`);
            });

        svg.call(zoom as any);

        // Helper functions
        const getAngle = (index: number) => angleScale(index);
        const getX = (year: number, angle: number, offset = 0) => 
            Math.cos(angle) * (radiusScale(year) + offset);
        const getY = (year: number, angle: number, offset = 0) => 
            Math.sin(angle) * (radiusScale(year) + offset);

        // Draw year rings (concentric circles)
        const yearRings = g.append('g').attr('id', 'year-rings');
        d3.range(YEAR_RANGE.min, YEAR_RANGE.max + 1).forEach(year => {
            yearRings.append('circle')
                .attr('id', `circle-${year}`)
                .attr('class', 'circle-line')
                .attr('r', radiusScale(year))
                .attr('fill', 'none')
                .attr('stroke', '#e3e3e3')
                .attr('stroke-width', 1)
                .attr('opacity', 1);
        });

        // Draw radial grid lines (one per member)
        const gridLines = g.append('g').attr('id', 'grid-lines');
        sortedMembers.forEach((member, index) => {
            const angle = getAngle(index);
            gridLines.append('line')
                .attr('class', 'grid-line')
                .attr('x1', getX(YEAR_RANGE.min, angle))
                .attr('y1', getY(YEAR_RANGE.min, angle))
                .attr('x2', getX(YEAR_RANGE.max, angle))
                .attr('y2', getY(YEAR_RANGE.max, angle))
                .attr('stroke', '#e3e3e3')
                .attr('stroke-width', 1)
                .attr('opacity', 1);
        });

        // Draw central group node
        const groupNode = g.append('g').attr('id', 'group-node');
        groupNode.append('circle')
            .attr('r', 30)
            .attr('fill', 'transparent')
            .attr('stroke', '#1a1a1a')
            .attr('stroke-width', 4);

        // Group name (split into lines if needed)
        const nameParts = group.name.split(' ');
        const nameText = groupNode.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-weight', 700);
        
        nameText.append('tspan')
            .attr('x', 0)
            .attr('y', nameParts.length > 1 ? -6 : 0)
            .attr('font-size', '12px')
            .text(nameParts[0] || '');
        
        if (nameParts[1]) {
            nameText.append('tspan')
                .attr('x', 0)
                .attr('y', 6)
                .attr('font-size', '12px')
                .text(nameParts[1]);
        }

        // Draw donut chart showing member distribution by groupBy
        const donutGroup = g.append('g')
            .attr('id', 'donut')
            .attr('transform', `rotate(90)`);

        // Calculate group distributions (how many members per group value)
        const membersByGroup = new Map<string, number>();
        sortedMembers.forEach((member, index) => {
            const groupValue = groupBy === 'sex' ? (member.sex || 'unknown') : (member.country || 'unknown');
            membersByGroup.set(groupValue, (membersByGroup.get(groupValue) || 0) + 1);
        });

        // Calculate angular ranges for each group
        const groupRanges = new Map<string, { minIndex: number; maxIndex: number; count: number }>();
        sortedMembers.forEach((member, index) => {
            const groupValue = groupBy === 'sex' ? (member.sex || 'unknown') : (member.country || 'unknown');
            
            if (!groupRanges.has(groupValue)) {
                groupRanges.set(groupValue, { minIndex: index, maxIndex: index, count: 1 });
            } else {
                const range = groupRanges.get(groupValue)!;
                range.maxIndex = index;
                range.count++;
            }
        });

        // Donut dimensions
        const donutInnerOffset = Math.max(3, minDimension * 0.012);
        const donutWidth = Math.max(6, minDimension * 0.015);
        const theta = (2 * Math.PI) / sortedMembers.length; // Angle per member

        // Create arc generator
        const arc = d3.arc<{ group: string; range: { minIndex: number; maxIndex: number; count: number } }>()
            .innerRadius(maxRadius + donutInnerOffset)
            .outerRadius(maxRadius + donutInnerOffset + donutWidth)
            .startAngle(d => getAngle(d.range.minIndex) - theta / 2)
            .endAngle(d => getAngle(d.range.maxIndex) + theta / 2);

        // Draw donut arcs
        const arcsData = Array.from(groupRanges.entries()).map(([groupValue, range]) => ({
            group: groupValue,
            range
        }));

        donutGroup.selectAll('path')
            .data(arcsData)
            .enter()
            .append('path')
            .attr('class', 'donut-arc')
            .attr('id', d => `donut-${d.group}`)
            .attr('fill', d => getColor(d.group))
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('d', arc)
            .attr('opacity', 1)
            .style('cursor', 'pointer')
            .on('mouseover', function(event: any, d: any) {
                const percentage = (d.range.count / sortedMembers.length) * 100;
                
                // Show tooltip
                d3.select('body').append('div')
                    .attr('class', 'donut-tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'rgba(0, 0, 0, 0.9)')
                    .style('color', 'white')
                    .style('padding', '10px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`)
                    .style('z-index', '1000')
                    .style('pointer-events', 'none')
                    .style('box-shadow', '0 2px 5px rgba(0,0,0,0.3)')
                    .html(`
                        <div><strong>${d.group}</strong></div>
                        <div>Members: ${d.range.count}</div>
                        <div>Percentage: ${percentage.toFixed(1)}%</div>
                        <div style="margin-top: 5px; font-size: 10px; opacity: 0.8;">Click to filter by group</div>
                    `);

                // Highlight arc
                d3.select(this)
                    .attr('stroke-width', 3)
                    .attr('stroke', '#ff6b35');
            })
            .on('mouseout', function() {
                // Remove tooltip
                d3.selectAll('.donut-tooltip').remove();

                // Reset arc unless selected
                const isSelected = d3.select(this).attr('data-selected') === 'true';
                if (!isSelected) {
                    d3.select(this)
                        .attr('stroke-width', 1)
                        .attr('stroke', 'white');
                }
            })
            .on('click', function(event: any, d: any) {
                const isSelected = d3.select(this).attr('data-selected') === 'true';
                
                if (isSelected) {
                    // Deselect: reset all
                    donutGroup.selectAll('path')
                        .attr('opacity', 1)
                        .attr('data-selected', 'false')
                        .attr('stroke', 'white')
                        .attr('stroke-width', 1);
                    
                    nodesGroup.selectAll('.exhibition-node')
                        .attr('opacity', 0.75);
                    
                    outerGroup.selectAll('.member-bar')
                        .attr('opacity', 0.75);
                    
                    outerGroup.selectAll('.member-label')
                        .attr('opacity', 1);
                } else {
                    // Select: dim others
                    donutGroup.selectAll('path')
                        .attr('opacity', 0.25)
                        .attr('data-selected', 'false')
                        .attr('stroke', 'white')
                        .attr('stroke-width', 1);
                    
                    d3.select(this)
                        .attr('opacity', 1)
                        .attr('data-selected', 'true')
                        .attr('stroke', '#ff6b35')
                        .attr('stroke-width', 2);
                    
                    // Highlight matching nodes
                    nodesGroup.selectAll('.exhibition-node')
                        .attr('opacity', (nodeData: any) => 
                            nodeData.group === d.group ? 0.75 : 0.15
                        );
                    
                    // Highlight matching outer elements
                    outerGroup.selectAll('.member-bar')
                        .attr('opacity', function() {
                            const parent = d3.select((this as any).parentNode);
                            const memberIndex = parent.datum() as number;
                            const member = sortedMembers[memberIndex];
                            const memberGroup = groupBy === 'sex' ? (member?.sex || 'unknown') : (member?.country || 'unknown');
                            return memberGroup === d.group ? 0.75 : 0.15;
                        });
                    
                    outerGroup.selectAll('.member-label')
                        .attr('opacity', function() {
                            const parent = d3.select((this as any).parentNode);
                            const memberIndex = parent.datum() as number;
                            const member = sortedMembers[memberIndex];
                            const memberGroup = groupBy === 'sex' ? (member?.sex || 'unknown') : (member?.country || 'unknown');
                            return memberGroup === d.group ? 1 : 0.3;
                        });
                }
                
                // Remove tooltip
                d3.selectAll('.donut-tooltip').remove();
            });

        // Draw exhibition nodes (dots at year-member intersections)
        const nodesGroup = g.append('g').attr('id', 'nodes');
        
        const nodes = nodesGroup.selectAll('.exhibition-node')
            .data(exhibitionData)
            .enter()
            .append('circle')
            .attr('class', 'exhibition-node')
            .attr('cx', d => getX(d.year, getAngle(d.memberIndex)))
            .attr('cy', d => getY(d.year, getAngle(d.memberIndex)))
            .attr('r', d => nodeSizeScale(d.count))
            .attr('fill', 'transparent')
            .attr('stroke', d => getColor(d.group))
            .attr('stroke-width', 2)
            .attr('opacity', 0.75)
            .style('cursor', 'pointer');

        // Draw outer member labels and bars
        const outerGroup = g.append('g').attr('id', 'outer-members');
        
        // Calculate total exhibitions per member for bar size
        const memberTotals = new Map<number, number>();
        exhibitionData.forEach(point => {
            const current = memberTotals.get(point.memberId) || 0;
            memberTotals.set(point.memberId, current + point.count);
        });

        const barLengthScale = d3.scaleLinear()
            .domain([0, d3.max(Array.from(memberTotals.values())) || 10])
            .range([3, minDimension * 0.06]);

        const barWidth = minDimension * 0.008;

        sortedMembers.forEach((member, index) => {
            const angle = getAngle(index);
            const totalExhibitions = memberTotals.get(member.id) || 0;
            const barHeight = barLengthScale(totalExhibitions);
            const baseX = getX(YEAR_RANGE.max, angle, labelOffset);
            const baseY = getY(YEAR_RANGE.max, angle, labelOffset);
            const angleDegrees = (angle * 180) / Math.PI;

            const memberGroup = outerGroup.append('g')
                .attr('class', 'member-group')
                .datum(index) // Store index for donut filtering
                .style('cursor', 'pointer');

            // Draw bar
            memberGroup.append('rect')
                .attr('class', 'member-bar')
                .attr('width', barWidth)
                .attr('height', barHeight)
                .attr('x', baseX - barWidth / 2)
                .attr('y', baseY)
                .attr('transform', `rotate(${angleDegrees - 90}, ${baseX}, ${baseY})`)
                .attr('fill', getColor(groupBy === 'sex' ? (member.sex || 'unknown') : (member.country || 'unknown')))
                .attr('opacity', 0.75);

            // Draw label
            let rotationAngle = angleDegrees;
            if (rotationAngle > 90 && rotationAngle < 270) {
                rotationAngle += 180;
            }

            let normalizedAngle = angleDegrees;
            if (normalizedAngle < 0) normalizedAngle += 360;
            const textAnchor = (normalizedAngle > 90 && normalizedAngle < 270) ? 'end' : 'start';

            const lastName = (member.sortname || '').trim().split(' ')[0] || member.sortname;
            
            memberGroup.append('text')
                .attr('class', 'member-label')
                .attr('x', baseX)
                .attr('y', baseY)
                .attr('transform', `rotate(${rotationAngle}, ${baseX}, ${baseY})`)
                .attr('text-anchor', textAnchor)
                .attr('font-size', `${Math.max(8, minDimension * 0.012)}px`)
                .attr('font-weight', 400)
                .attr('fill', 'black')
                .attr('stroke', 'white')
                .attr('stroke-width', '0.5px')
                .attr('paint-order', 'stroke')
                .attr('dy', '0.35em')
                .text(lastName);

            // Add interactions
            memberGroup
                .on('mouseover', function(event: any) {
                    // Highlight label
                    d3.select(this).select('.member-label')
                        .attr('font-weight', 700);

                    // Show tooltip
                    const tooltipDiv = d3.select('body').append('div')
                        .attr('class', 'member-tooltip')
                        .style('position', 'absolute')
                        .style('background-color', 'black')
                        .style('color', 'white')
                        .style('padding', '8px')
                        .style('border-radius', '5px')
                        .style('font-size', '12px')
                        .style('left', `${event.pageX + 10}px`)
                        .style('top', `${event.pageY - 10}px`)
                        .style('z-index', '1000')
                        .style('pointer-events', 'none')
                        .html(`
                            <strong>${member.sortname}</strong><br/>
                            Country: ${member.country || 'Unknown'}<br/>
                            Sex: ${member.sex || 'Unknown'}<br/>
                            Total exhibitions: ${totalExhibitions}
                        `);
                })
                .on('mouseout', function() {
                    // Reset label
                    d3.select(this).select('.member-label')
                        .attr('font-weight', 400);
                    
                    // Remove tooltip
                    d3.selectAll('.member-tooltip').remove();
                })
                .on('click', function() {
                    window.location.href = `/artist/${member.id}`;
                });
        });

        // Node interactions
        nodes
            .on('mouseover', function(event: any, d: MemberExhibitionPoint) {
                // Highlight year ring
                const yearRing = d3.select(`#circle-${d.year}`);
                if (!yearRing.empty()) {
                    yearRing
                        .attr('stroke', '#ff6b35')
                        .attr('stroke-width', 3)
                        .attr('stroke-dasharray', '8,4');
                }

                // Notify parent to update highlightedYear (which shows gridline in timeline)
                if (onYearHover) {
                    onYearHover(d.year);
                }

                // Enlarge node
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', nodeSizeScale(d.count) + 3)
                    .attr('stroke-width', 3);

                // Show tooltip
                d3.select('body').append('div')
                    .attr('class', 'node-tooltip')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '8px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`)
                    .style('z-index', '1000')
                    .style('pointer-events', 'none')
                    .html(`
                        <strong>${d.memberName} (${d.year})</strong><br/>
                        Exhibitions: ${d.count}<br/>
                        Artworks: ${d.totalArtworks}
                    `);
            })
            .on('mousemove', function(event: any) {
                d3.select('.node-tooltip')
                    .style('left', `${event.pageX + 10}px`)
                    .style('top', `${event.pageY - 10}px`);
            })
            .on('mouseout', function(event: any, d: MemberExhibitionPoint) {
                // Reset year ring
                d3.selectAll('.circle-line')
                    .attr('stroke', '#e3e3e3')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', 'none');

                // Notify parent to clear highlightedYear (which removes gridline in timeline)
                if (onYearMouseOut) {
                    onYearMouseOut();
                }

                // Reset node
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', nodeSizeScale(d.count))
                    .attr('stroke-width', 2);

                // Remove tooltip
                d3.selectAll('.node-tooltip').remove();
            })
            .on('click', function(event: any, d: MemberExhibitionPoint) {
                window.location.href = `/artist/${d.memberId}`;
            });

        // Cleanup
        return () => {
            d3.selectAll('.member-tooltip, .node-tooltip, .donut-tooltip').remove();
        };
    }, [sortedMembers, exhibitionData, containerWidth, containerHeight, groupBy, group]);

    // Handle highlighted year from timeline
    useEffect(() => {
        if (highlightedYear !== null && highlightedYear !== undefined) {
            d3.select(`#circle-${highlightedYear}`)
                .attr('stroke', '#ff6b35')
                .attr('stroke-width', 3)
                .attr('stroke-dasharray', '8,4');
        } else {
            d3.selectAll('.circle-line')
                .attr('stroke', '#e3e3e3')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', 'none');
        }
    }, [highlightedYear]);

    return (
        <div ref={containerRef} className="w-full h-full">
            <svg
                ref={svgRef}
                width={containerWidth}
                height={containerHeight}
                style={{ display: 'block' }}
            />
        </div>
    );
};

export default GroupNetwork;
