import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Group } from '../../models/group.model';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import { generateGroupNetworkData } from '../../utils/groupUtils';
import { countryColors, sexColors } from '../../colors/colors';

interface GroupNetworkProps {
    group: Group;
    links: Link[];
    width?: number;
    height?: number;
    coExhibitionCount?: number;
    groupBy?: string;
    highlightedYear?: number | null;
}

const GroupNetwork: React.FC<GroupNetworkProps> = ({
    group,
    links,
    width = 600,
    height = 600,
    coExhibitionCount = 3,
    groupBy = 'country',
    highlightedYear
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

    // Filter links based on co-exhibition count
    const filteredLinks = useMemo(() => {
        return links.filter(link => {
            const count = link.props?.data?.count || 0;
            return count >= coExhibitionCount;
        });
    }, [links, coExhibitionCount]);

    // Extract unique nodes from links
    const nodes = useMemo(() => {
        const nodeMap = new Map<number, Node>();
        
        filteredLinks.forEach(link => {
            if (link.source && !nodeMap.has(+link.source.id)) {
                nodeMap.set(+link.source.id, link.source);
            }
            if (link.target && !nodeMap.has(+link.target.id)) {
                nodeMap.set(+link.target.id, link.target);
            }
        });

        return Array.from(nodeMap.values());
    }, [filteredLinks]);

    // Get color for a node based on groupBy
    const getNodeColor = (node: Node): string => {
        const data = node.props?.data;
        if (!data) return '#999';

        switch (groupBy) {
            case 'country':
                return countryColors.get(data.country) || '#999';
            case 'sex':
                return sexColors.get(data.sex) || '#999';
            default:
                return '#999';
        }
    };

    // Render network
    useEffect(() => {
        if (!svgRef.current || nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        const radius = Math.min(containerWidth, containerHeight) / 2 - 50;

        // Create main group
        const g = svg.append('g')
            .attr('transform', `translate(${centerX},${centerY})`);

        // Position nodes in a circle
        nodes.forEach((node, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI;
            (node as any).x = Math.cos(angle) * radius;
            (node as any).y = Math.sin(angle) * radius;
        });

        // Draw links
        const linkElements = g.selectAll('.link')
            .data(filteredLinks)
            .enter()
            .append('line')
            .attr('class', 'link')
            .attr('x1', d => (d.source as any).x)
            .attr('y1', d => (d.source as any).y)
            .attr('x2', d => (d.target as any).x)
            .attr('y2', d => (d.target as any).y)
            .attr('stroke', d => {
                if (highlightedYear && d.props?.data?.year === highlightedYear) {
                    return 'orange';
                }
                return '#999';
            })
            .attr('stroke-width', d => {
                const count = d.props?.data?.count || 1;
                return Math.sqrt(count) * 1.5;
            })
            .attr('stroke-opacity', d => {
                if (highlightedYear) {
                    return d.props?.data?.year === highlightedYear ? 0.8 : 0.2;
                }
                return 0.4;
            });

        // Draw nodes
        const nodeElements = g.selectAll('.node')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${(d as any).x},${(d as any).y})`);

        nodeElements.append('circle')
            .attr('r', 8)
            .attr('fill', d => getNodeColor(d))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        nodeElements.append('text')
            .attr('dy', -12)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', '#333')
            .text(d => d.name);

        // Tooltip
        const tooltip = d3.select('body')
            .append('div')
            .style('position', 'absolute')
            .style('visibility', 'hidden')
            .style('background-color', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000');

        nodeElements
            .on('mouseover', function(event, d) {
                const data = d.props?.data;
                tooltip
                    .style('visibility', 'visible')
                    .html(`
                        <strong>${d.name}</strong><br/>
                        ${data?.country || 'Unknown country'}<br/>
                        ${data?.sex || 'Unknown sex'}
                    `);
            })
            .on('mousemove', function(event) {
                tooltip
                    .style('top', (event.pageY - 10) + 'px')
                    .style('left', (event.pageX + 10) + 'px');
            })
            .on('mouseout', function() {
                tooltip.style('visibility', 'hidden');
            });

        return () => {
            tooltip.remove();
        };
    }, [nodes, filteredLinks, containerWidth, containerHeight, groupBy, highlightedYear]);

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
