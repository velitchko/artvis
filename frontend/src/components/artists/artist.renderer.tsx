import React from 'react';
import { Artist } from '../../models/artist.model';
import ArtistCanvasGrid from './artist.canvas.grid';
import ArtistCardComponent from './artist.card';
import { NavigateFunction } from 'react-router-dom';
import * as d3 from 'd3';

interface ArtistRendererProps {
    artists: Array<Artist>;
    onReorderBySimilarity: (artistId: number) => void;
    navigate: NavigateFunction;
    useCanvas?: boolean; // Toggle between canvas and SVG rendering
    forcedColumnsPerRow?: number; // For canvas grid
    searchArtistId?: number; // For canvas grid
    similarityBaseArtist?: Artist; // For canvas grid similarity highlighting
    timelineScaling?: 'absolute' | 'relative'; // Timeline scaling mode
    curveRendering?: 'jagged' | 'smooth'; // Curve rendering style
}

const ArtistRenderer: React.FC<ArtistRendererProps> = ({ 
    artists, 
    onReorderBySimilarity, 
    navigate, 
    useCanvas = true,
    forcedColumnsPerRow,
    searchArtistId,
    similarityBaseArtist,
    timelineScaling = 'relative',
    curveRendering = 'jagged'
}) => {
    console.log('ArtistRenderer - Received artists:', artists.length);
    
    if (useCanvas) {
        return (
            <ArtistCanvasGrid 
                artists={artists} 
                onReorderBySimilarity={onReorderBySimilarity}
                forcedColumnsPerRow={forcedColumnsPerRow}
                searchArtistId={searchArtistId}
                similarityBaseArtist={similarityBaseArtist}
                timelineScaling={timelineScaling}
                curveRendering={curveRendering}
            />
        );
    }

    // Fallback to original SVG rendering for comparison
    const width = window.innerWidth;
    const chartCount = 7;
    const chartWidth = width / chartCount;
    
    // Calculate extents for SVG version
    let totalYearCount = new Map<number, number>();
    artists.forEach((artist: Artist) => {
        artist.exhibitedAtExhibitions?.filter((exhibition, index, self) => 
            self.findIndex((t) => t.id === exhibition.id) === index
        ).forEach((exhibition) => {
            const count = totalYearCount.get(+exhibition.startdate);
            totalYearCount.set(+exhibition.startdate, count ? Math.max(count, 1) : 1);
        });
    });
    
    const xExt = d3.extent(Array.from(totalYearCount.keys()));
    const yExt = d3.extent(Array.from(totalYearCount.values()));

    return (
        <div className="flex flex-wrap items-center justify-center w-full">
            {artists && artists.map((artist: Artist) => {
                return (
                    <ArtistCardComponent 
                        artist={artist} 
                        key={artist.id} 
                        width={chartWidth} 
                        height={150} 
                        yearExtent={xExt} 
                        countExtent={yExt} 
                        navigate={navigate} 
                        reorderSim={onReorderBySimilarity} 
                    />
                );
            })}
        </div>
    );
};

export default ArtistRenderer;
