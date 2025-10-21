import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useNavigate } from 'react-router-dom';

interface GroupCardProps {
    group: {
        id: number;
        name: string;
        artistsMemberOfAggregate: {
            count: number;
        };
        artistsMemberOf?: Array<{
            id: number;
            exhibitedAtExhibitions?: Array<{
                id: number;
                startyear: number;
            }>;
        }>;
    };
    width?: number;
    height?: number;
}

const YEAR_RANGE = { min: 1905, max: 1915 };

const GroupCard: React.FC<GroupCardProps> = ({ 
    group, 
    width = 280, 
    height = 40 
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!svgRef.current || !group.artistsMemberOf) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        // Use actual SVG width instead of prop default
        const actualWidth = svgRef.current.clientWidth || width;
        const actualHeight = height;

        const margin = { top: 2, right: 0, bottom: 2, left: 0 };
        const innerWidth = actualWidth - margin.left - margin.right;
        const innerHeight = actualHeight - margin.top - margin.bottom;

        // Calculate exhibitions per year across all members
        const exhibitionsPerYear = new Map<number, Set<number>>();
        
        group.artistsMemberOf.forEach(member => {
            member.exhibitedAtExhibitions?.forEach(exhibition => {
                const year = +exhibition.startyear;
                const exhibitionId = +exhibition.id;
                
                if (year >= YEAR_RANGE.min && year <= YEAR_RANGE.max) {
                    if (!exhibitionsPerYear.has(year)) {
                        exhibitionsPerYear.set(year, new Set());
                    }
                    exhibitionsPerYear.get(year)?.add(exhibitionId);
                }
            });
        });

        // Convert to array with all years filled in
        const years = Array.from(
            { length: YEAR_RANGE.max - YEAR_RANGE.min + 1 }, 
            (_, i) => YEAR_RANGE.min + i
        );

        const data = years.map(year => ({
            year,
            count: exhibitionsPerYear.get(year)?.size || 0
        }));

        // Scales
        const xScale = d3.scaleLinear()
            .domain([YEAR_RANGE.min, YEAR_RANGE.max])
            .range([margin.left, actualWidth - margin.right]);

        const maxCount = d3.max(data, d => d.count) || 1;
        const yScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range([actualHeight - margin.bottom, margin.top]);

        // Main group
        const g = svg.append('g');

        // Draw simple line (no fill)
        const line = d3.line<{ year: number; count: number }>()
            .x(d => xScale(d.year))
            .y(d => yScale(d.count))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'black')
            .attr('stroke-width', 2)
            .attr('d', line);

    }, [group, width, height]);

    const handleClick = () => {
        navigate(`/group/${group.id}`);
    };

    // Calculate year range
    const getYearRange = (): { min: number; max: number } | null => {
        if (!group.artistsMemberOf) return null;

        let minYear = YEAR_RANGE.max;
        let maxYear = YEAR_RANGE.min;

        group.artistsMemberOf.forEach(member => {
            member.exhibitedAtExhibitions?.forEach(exhibition => {
                const year = +exhibition.startyear;
                if (year >= YEAR_RANGE.min && year <= YEAR_RANGE.max) {
                    if (year < minYear) minYear = year;
                    if (year > maxYear) maxYear = year;
                }
            });
        });

        return minYear <= maxYear ? { min: minYear, max: maxYear } : null;
    };

    const yearRange = getYearRange();

    return (
        <div 
            onClick={handleClick}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden border-2 border-gray-200 hover:border-blue-500"
        >
            <div className="p-3 pb-1">
                <h3 className="text-base font-bold mb-0.5 truncate">{group.name}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-1">
                    <span className="font-semibold">
                        {group.artistsMemberOfAggregate.count} 
                        {group.artistsMemberOfAggregate.count === 1 ? ' member' : ' members'}
                    </span>
                    {yearRange && (
                        <>
                            <span className="text-gray-400">•</span>
                            <span>{yearRange.min}–{yearRange.max}</span>
                        </>
                    )}
                </div>
            </div>
            
            {/* Sparkline */}
            <div className="px-3 pb-3">
                <svg 
                    ref={svgRef} 
                    width={width} 
                    height={height}
                    className="w-full"
                    style={{ maxHeight: '40px' }}
                />
            </div>
        </div>
    );
};

export default GroupCard;
