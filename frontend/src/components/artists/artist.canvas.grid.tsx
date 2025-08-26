import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';

interface ArtistCanvasGridProps {
    artists: Array<Artist>;
    onReorderBySimilarity: (artistId: number) => void;
    forcedColumnsPerRow?: number; // 0 means auto-fit
    searchArtistId?: number; // Artist to scroll to
    similarityBaseArtist?: Artist; // Base artist for similarity highlighting
    timelineScaling?: 'absolute' | 'relative'; // Timeline scaling mode
    curveRendering?: 'jagged' | 'smooth'; // Curve rendering style
}

interface ArtistGridItem {
    artist: Artist;
    uniqueId: string | number; // Unique identifier that handles null IDs
    x: number;
    y: number;
    width: number;
    height: number;
    timelineData: Array<{ year: number; count: number }>;
}

const ArtistCanvasGrid: React.FC<ArtistCanvasGridProps> = ({ 
    artists, 
    onReorderBySimilarity, 
    forcedColumnsPerRow = 0, 
    searchArtistId,
    similarityBaseArtist,
    timelineScaling = 'relative',
    curveRendering = 'jagged'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    
    // Grid configuration - More compact layout
    const CARD_WIDTH = 200;
    const CARD_HEIGHT = 60; // Reduced height to eliminate overlap
    const CARD_MARGIN = 6; // Reduced margin
    const CHART_HEIGHT = 35; // Balanced chart area
    const CHART_MARGIN = { top: 3, bottom: 3, left: 8, right: 8 };
    
    const [gridItems, setGridItems] = useState<Array<ArtistGridItem>>([]);
    const [hoveredArtist, setHoveredArtist] = useState<number | string | null>(null); // Use index as fallback for null IDs
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const [isReady, setIsReady] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);
    const [layoutInfo, setLayoutInfo] = useState<{
        itemsPerRow: number;
        totalRows: number;
        artists: Artist[];
    } | null>(null);
    const [totalContentHeight, setTotalContentHeight] = useState(0);
    
    // Virtualization settings - Use dynamic height based on available space
    const HEADER_HEIGHT = 64; // Match pt-16 (64px) from parent component
    const PADDING_BUFFER = 20; // Extra buffer for margins and spacing
    const [viewportHeight, setViewportHeight] = React.useState(window.innerHeight - HEADER_HEIGHT - PADDING_BUFFER);
    const [containerWidth, setContainerWidth] = React.useState(window.innerWidth - 16);
    const BUFFER_ROWS = 2; // Extra rows to render above/below viewport

    // Update viewport dimensions on window resize with proper debouncing
    React.useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        
        const handleResize = () => {
            // Debounce the resize to avoid excessive recalculations
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setViewportHeight(window.innerHeight - HEADER_HEIGHT - PADDING_BUFFER);
                setContainerWidth(window.innerWidth - 16);
            }, 150); // 150ms debounce
        };
        
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Additional ResizeObserver for container element changes
    React.useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect;
                setContainerWidth(width - 16); // Account for padding
            }
        });
        
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Debug logging
    useEffect(() => {
        console.log('ArtistCanvasGrid - Artists received:', artists.length);
        console.log('Sample artist:', artists[0]);
    }, [artists]);

    // Calculate year and count extents for consistent scaling
    const getExtents = (artistsToUse: Artist[] = artists) => {
        let allYears: number[] = [];
        let allCounts: number[] = [];

        console.log(artistsToUse)
        
        artistsToUse.forEach(artist => {
            if (artist.exhibitedAtExhibitions) {
                const yearCounts = new Map<number, number>();
                artist.exhibitedAtExhibitions
                    .filter((exhibition, index, self) => 
                        self.findIndex(e => e.id === exhibition.id) === index
                    )
                    .forEach(exhibition => {
                        // Parse year from startdate - handle different date formats
                        let year: number = NaN;
                        
                        try {
                            if (exhibition.startdate instanceof Date) {
                                year = exhibition.startdate.getFullYear();
                            } else {
                                // Convert to string first to handle any type
                                const dateStr = String(exhibition.startdate);
                                
                                // Try to extract 4-digit year from string
                                const yearMatch = dateStr.match(/(\d{4})/);
                                if (yearMatch) {
                                    year = parseInt(yearMatch[1]);
                                } else {
                                    // Try direct conversion
                                    year = parseInt(dateStr);
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to parse date:', exhibition.startdate, e);
                        }
                        
                        // Debug first few exhibitions
                        if (allYears.length < 5) {
                            console.log('Exhibition startdate:', exhibition.startdate, 'type:', typeof exhibition.startdate, 'parsed year:', year);
                        }
                        
                        if (!isNaN(year) && year > 1800 && year < 2100) { // Filter reasonable years
                            yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
                        }
                    });
                
                allYears.push(...Array.from(yearCounts.keys()));
                allCounts.push(...Array.from(yearCounts.values()));
            }
        });
        
        const yearExtent = allYears.length > 0 ? d3.extent(allYears) as [number, number] : [1900, 2000];
        const countExtent = allCounts.length > 0 ? [0, d3.max(allCounts) || 1] as [number, number] : [0, 1];
        
        console.log('Year extent:', yearExtent);
        console.log('Count extent:', countExtent);
        console.log('Sample years found:', allYears.slice(0, 10));
        console.log('Sample counts found:', allCounts.slice(0, 10));
        
        return { yearExtent, countExtent };
    };

    // Calculate grid layout and prepare data with virtualization
    useEffect(() => {
        console.log('Calculating grid layout for', artists.length, 'artists');
        
        if (!artists.length) {
            console.log('No artists provided');
            setIsReady(false);
            return;
        }

        // Use all artists but implement virtualization
        const limitedArtists = artists;
        console.log('Using all artists with virtualization:', limitedArtists.length);
        
        // Debug: Check for duplicate artists in the source data
        const artistIds = limitedArtists.map(artist => artist.id);
        const uniqueArtistIds = new Set(artistIds);
        if (artistIds.length !== uniqueArtistIds.size) {
            console.warn('Found duplicate artists in source data! Total:', artistIds.length, 'Unique:', uniqueArtistIds.size);
            
            // Find and log the duplicates
            const duplicates = artistIds.filter((id, index) => artistIds.indexOf(id) !== index);
            console.warn('Duplicate artist IDs:', [...new Set(duplicates)]);
        }

        const containerWidthToUse = containerWidth; // Use reactive container width
        
        // Calculate items per row - use forced columns or auto-fit
        let itemsPerRow: number;
        if (forcedColumnsPerRow > 0) {
            itemsPerRow = forcedColumnsPerRow;
        } else {
            itemsPerRow = Math.floor(containerWidthToUse / (CARD_WIDTH + CARD_MARGIN));
        }
        const actualItemsPerRow = Math.max(1, itemsPerRow);
        const totalRows = Math.ceil(limitedArtists.length / actualItemsPerRow);
        
        // Canvas is only the viewport size, not the total content size
        const canvasWidth = actualItemsPerRow * (CARD_WIDTH + CARD_MARGIN) - CARD_MARGIN;
        const canvasHeight = viewportHeight;
        
        console.log('Virtualized canvas dimensions:', { width: canvasWidth, height: canvasHeight });
        console.log('Total content would be:', { rows: totalRows, height: totalRows * (CARD_HEIGHT + CARD_MARGIN) });
        
        setCanvasSize({ width: canvasWidth, height: canvasHeight });

        const { yearExtent, countExtent } = getExtents(limitedArtists);
        
        console.log('Processing', limitedArtists.length, 'artists for grid items...');
        const startTime = performance.now();
        
        const items: Array<ArtistGridItem> = limitedArtists.map((artist, index) => {
            // Show progress for large datasets
            if (index > 0 && index % 1000 === 0) {
                console.log(`Processed ${index}/${limitedArtists.length} artists...`);
            }
            
            const row = Math.floor(index / actualItemsPerRow);
            const col = index % actualItemsPerRow;
            const x = col * (CARD_WIDTH + CARD_MARGIN);
            const y = row * (CARD_HEIGHT + CARD_MARGIN);

            // Prepare timeline data
            const exhibitionsPerYear = new Map<number, number>();
            if (artist.exhibitedAtExhibitions) {
                artist.exhibitedAtExhibitions
                    .filter((exhibition, index, self) => 
                        self.findIndex(e => e.id === exhibition.id) === index
                    )
                    .forEach(exhibition => {
                        // Parse year from startdate - handle different date formats
                        let year: number = NaN;
                        
                        try {
                            if (exhibition.startdate instanceof Date) {
                                year = exhibition.startdate.getFullYear();
                            } else {
                                // Convert to string first to handle any type
                                const dateStr = String(exhibition.startdate);
                                
                                // Try to extract 4-digit year from string
                                const yearMatch = dateStr.match(/(\d{4})/);
                                if (yearMatch) {
                                    year = parseInt(yearMatch[1]);
                                } else {
                                    // Try direct conversion
                                    year = parseInt(dateStr);
                                }
                            }
                        } catch (e) {
                            // Silently handle parsing errors
                        }
                        
                        if (!isNaN(year) && year > 1800 && year < 2100) { // Filter reasonable years
                            exhibitionsPerYear.set(year, (exhibitionsPerYear.get(year) || 0) + 1);
                        }
                    });
            }

            // Fill in missing years with 0
            const timelineData: Array<{ year: number; count: number }> = [];
            if (yearExtent[0] && yearExtent[1]) {
                for (let year = yearExtent[0]; year <= yearExtent[1]; year++) {
                    timelineData.push({
                        year,
                        count: exhibitionsPerYear.get(year) || 0
                    });
                }
            }

            // Debug for first artist
            if (index === 0) {
                console.log('First artist exhibitions per year:', Array.from(exhibitionsPerYear.entries()));
                console.log('First artist timeline data sample:', timelineData.slice(0, 10));
            }

            return {
                artist,
                uniqueId: artist.id !== null ? artist.id : `artist-${index}`, // Use ID if available, otherwise use index
                x,
                y,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                timelineData
            };
        });

        const endTime = performance.now();
        console.log(`Grid items created: ${items.length} in ${(endTime - startTime).toFixed(2)}ms`);
        setGridItems(items);
        
        setLayoutInfo({
            itemsPerRow: actualItemsPerRow,
            totalRows,
            artists: limitedArtists
        });
        
        // Calculate total content height for scrollable container
        const totalContentHeight = totalRows * (CARD_HEIGHT + CARD_MARGIN) - CARD_MARGIN;
        setTotalContentHeight(totalContentHeight);
        
        setIsReady(true);
    }, [artists, forcedColumnsPerRow, containerWidth, viewportHeight]);

    // Handle scrolling to searched artist
    useEffect(() => {
        if (!searchArtistId || !gridItems.length || !layoutInfo) return;
        
        // Clear any existing hover state when searching
        setHoveredArtist(null);
        
        const artistIndex = gridItems.findIndex(item => item.artist.id === searchArtistId);
        if (artistIndex === -1) return;
        
        const row = Math.floor(artistIndex / layoutInfo.itemsPerRow);
        const targetScrollTop = row * (CARD_HEIGHT + CARD_MARGIN);
        
        // Scroll to the artist with some padding
        const scrollContainer = containerRef.current?.querySelector('.no-scrollbar') as HTMLDivElement;
        if (scrollContainer) {
            scrollContainer.scrollTop = Math.max(0, targetScrollTop - 50);
        }
    }, [searchArtistId, gridItems, layoutInfo]);

    // Render the canvas with virtualization
    useEffect(() => {
        console.log('Render effect triggered - isReady:', isReady, 'gridItems:', gridItems.length, 'scrollTop:', scrollTop);
        
        if (!canvasRef.current || !gridItems.length || !isReady || !layoutInfo) {
            console.log('Render conditions not met');
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.log('Failed to get canvas context');
            return;
        }

        console.log('Starting virtualized canvas render...');

        // Calculate which items are visible based on scroll position
        const itemHeight = CARD_HEIGHT + CARD_MARGIN;
        const startRow = Math.max(0, Math.floor(scrollTop / itemHeight) - BUFFER_ROWS);
        const endRow = Math.min(layoutInfo.totalRows - 1, 
            Math.floor((scrollTop + viewportHeight) / itemHeight) + BUFFER_ROWS);
        
        const startIndex = startRow * layoutInfo.itemsPerRow;
        const endIndex = Math.min(gridItems.length - 1, (endRow + 1) * layoutInfo.itemsPerRow - 1);
        
        console.log(`Rendering rows ${startRow}-${endRow} (items ${startIndex}-${endIndex}) from scroll ${scrollTop}`);
        
        // Filter items to only visible ones, adjusting their y position for the scroll offset
        const visibleItems = gridItems.slice(startIndex, endIndex + 1).map(item => ({
            ...item,
            y: item.y - scrollTop // Adjust y position for scroll offset
        }));

        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Set the internal size to the display size times DPR
        canvas.width = canvasSize.width * dpr;
        canvas.height = canvasSize.height * dpr;
        
        // Scale the canvas back down using CSS
        canvas.style.width = canvasSize.width + 'px';
        canvas.style.height = canvasSize.height + 'px';
        
        // Scale the drawing context so everything draws at the correct size
        ctx.scale(dpr, dpr);

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        const { yearExtent, countExtent } = getExtents(artists);
        
        // Create scales for timeline
        const xScale = d3.scaleLinear()
            .domain(yearExtent)
            .range([CHART_MARGIN.left, CARD_WIDTH - CHART_MARGIN.right]);
        
        // Y-scale is now dynamic based on timelineScaling mode
        // It will be created per-item for relative scaling, or use global extent for absolute scaling
        const globalYScale = d3.scaleLinear()
            .domain(countExtent)
            .range([CHART_HEIGHT - CHART_MARGIN.bottom, CHART_MARGIN.top]);

        console.log('Rendering', visibleItems.length, 'visible items out of', gridItems.length, 'total');

        // Debug: Check for duplicate IDs that might cause multiple highlights
        const visibleArtistIds = visibleItems.map(item => item.artist.id);
        const uniqueIds = new Set(visibleArtistIds);
        if (visibleArtistIds.length !== uniqueIds.size) {
            console.warn('Found duplicate artist IDs in visible items:', visibleArtistIds);
        }

        visibleItems.forEach((item, index) => {
            const { artist, uniqueId, x, y, width, height, timelineData } = item;
            const isHovered = hoveredArtist === uniqueId;
            const isSearchHighlighted = searchArtistId !== undefined && searchArtistId === artist.id;

            // Draw yellow highlight background for hover
            if (isHovered && !isSearchHighlighted) {
                ctx.fillStyle = '#fde047'; // Bright yellow background for hover
                ctx.fillRect(x, y, width, height);
            }

            // Draw dashed yellow stroke for search highlight
            if (isSearchHighlighted) {
                ctx.strokeStyle = '#eab308'; // Darker yellow for better visibility
                ctx.lineWidth = 3;
                ctx.setLineDash([8, 4]); // Dashed pattern: 8px dash, 4px gap
                ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3); // Slight inset for better appearance
                ctx.setLineDash([]); // Reset line dash for other drawing
            }

            // Draw dashed yellow stroke for similarity base artist highlight
            const isSimilarityBase = similarityBaseArtist?.id === artist.id;
            if (isSimilarityBase && !isSearchHighlighted) {
                ctx.strokeStyle = '#eab308'; // Same yellow as search
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]); // Different dashing pattern to distinguish from search
                ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
                ctx.setLineDash([]); // Reset line dash for other drawing
            }

            // Draw timeline in the upper portion of the card, well above text
            if (timelineData.length > 1) {
                const timelineY = y + 3; // Start timeline very close to top
                
                // Create y-scale based on scaling mode
                let yScale: d3.ScaleLinear<number, number>;
                if (timelineScaling === 'absolute') {
                    // Use global scale for absolute scaling
                    yScale = globalYScale;
                } else {
                    // Create relative scale using this artist's data extent
                    const artistMaxCount = d3.max(timelineData, d => d.count) || 1;
                    yScale = d3.scaleLinear()
                        .domain([0, artistMaxCount])
                        .range([CHART_HEIGHT - CHART_MARGIN.bottom, CHART_MARGIN.top]);
                }
                
                // Improve line rendering quality
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round'; // Smoother line endings
                ctx.lineJoin = 'round'; // Smoother line joins
                ctx.beginPath();
                
                // Prepare valid points for rendering
                const validPoints: Array<{ x: number; y: number }> = [];
                timelineData.forEach((d, i) => {
                    const chartX = x + xScale(d.year);
                    const chartY = timelineY + yScale(d.count);
                    
                    // Round coordinates for crisp rendering
                    const roundedX = Math.round(chartX) + 0.5;
                    const roundedY = Math.round(chartY) + 0.5;
                    
                    // Check if the coordinates are valid
                    if (!isNaN(roundedX) && !isNaN(roundedY) && isFinite(roundedX) && isFinite(roundedY)) {
                        validPoints.push({ x: roundedX, y: roundedY });
                    }
                });
                
                if (validPoints.length > 0) {
                    if (curveRendering === 'smooth' && validPoints.length > 2) {
                        // Smooth curve using quadratic bezier curves
                        ctx.moveTo(validPoints[0].x, validPoints[0].y);
                        
                        for (let i = 1; i < validPoints.length - 1; i++) {
                            const currentPoint = validPoints[i];
                            const nextPoint = validPoints[i + 1];
                            
                            // Calculate control point for smooth curves
                            const controlX = currentPoint.x;
                            const controlY = currentPoint.y;
                            const endX = (currentPoint.x + nextPoint.x) / 2;
                            const endY = (currentPoint.y + nextPoint.y) / 2;
                            
                            ctx.quadraticCurveTo(controlX, controlY, endX, endY);
                        }
                        
                        // Draw line to the last point
                        if (validPoints.length > 1) {
                            const lastPoint = validPoints[validPoints.length - 1];
                            ctx.lineTo(lastPoint.x, lastPoint.y);
                        }
                    } else {
                        // Jagged/sharp lines (original behavior)
                        ctx.moveTo(validPoints[0].x, validPoints[0].y);
                        for (let i = 1; i < validPoints.length; i++) {
                            ctx.lineTo(validPoints[i].x, validPoints[i].y);
                        }
                    }
                    
                    ctx.stroke();
                }
            }

            // Draw artist info below the timeline with adequate spacing to prevent overlap
            const textStartY = y + CHART_HEIGHT + 10; // Increased spacing to clear timeline base
            
            // Calculate rank based on actual position in the sorted list
            const originalIndex = gridItems.findIndex(gridItem => gridItem.artist.id === artist.id);
            const rank = originalIndex + 1;
            
            // Draw artist name with rank in bold
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'left';
            
            const artistName = `${artist.firstname || ''} ${artist.lastname || ''}`.trim();
            const rankedName = `${rank}. ${artistName}`;
            ctx.fillText(truncateText(ctx, rankedName, width - 30), x + 2, textStartY);
            
            // Draw country and life years in regular font - closer spacing
            ctx.font = '8px Arial';
            const lifeSpan = `(${artist.country || '?'}) ${artist.birthyear || '?'}-${artist.deathyear || '?'}`;
            ctx.fillText(truncateText(ctx, lifeSpan, width - 30), x + 2, textStartY + 8);

            // Note: Use Ctrl+Click to open artist detail page in new tab
        });
        
        console.log('Canvas render complete');
    }, [gridItems, hoveredArtist, canvasSize, isReady, scrollTop, layoutInfo, curveRendering, timelineScaling]);

    // Helper function to truncate text
    const truncateText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
        if (ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        let truncated = text;
        while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
        }
        
        return truncated + '...';
    };

    // Handle mouse interactions with scroll offset
    const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Find hovered artist - more precise hit detection with stricter bounds
        const hoveredItem = gridItems.find(item => {
            const itemScreenY = item.y - scrollTop;
            
            // Stricter bounds checking with small margin to prevent edge cases
            const margin = 1;
            const isInHorizontalBounds = mouseX >= (item.x + margin) && mouseX <= (item.x + item.width - margin);
            const isInVerticalBounds = mouseY >= (itemScreenY + margin) && mouseY <= (itemScreenY + item.height - margin);
            
            // Only consider items that are actually visible on screen
            const isVisible = itemScreenY + item.height >= 0 && itemScreenY <= viewportHeight;
            
            // Additional check: ensure we're not in empty space
            const isWithinCanvas = mouseX >= 0 && mouseX <= canvasSize.width && mouseY >= 0 && mouseY <= canvasSize.height;
            
            return isInHorizontalBounds && isInVerticalBounds && isVisible && isWithinCanvas;
        });

        const newHoveredArtistId = hoveredItem ? hoveredItem.uniqueId : null;
        
        // Debug logging to track hover behavior
        if (newHoveredArtistId !== hoveredArtist) {
            console.log('Hover changed from', hoveredArtist, 'to', newHoveredArtistId);
            if (hoveredItem) {
                console.log('Hovered artist:', hoveredItem.artist.firstname, hoveredItem.artist.lastname, 'ID:', hoveredItem.artist.id, 'UniqueID:', hoveredItem.uniqueId);
            }
        }

        setHoveredArtist(newHoveredArtistId);
        
        // Change cursor - show pointer when hovering over any card
        if (hoveredItem) {
            // Show pointer cursor when hovering over a card (click for similarity, Ctrl+click for detail page)
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    };

    const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Find clicked artist - more precise hit detection
        const clickedItem = gridItems.find(item => {
            const itemScreenY = item.y - scrollTop;
            const isInHorizontalBounds = mouseX >= item.x && mouseX <= item.x + item.width;
            const isInVerticalBounds = mouseY >= itemScreenY && mouseY <= itemScreenY + item.height;
            
            // Only consider items that are actually visible on screen
            const isVisible = itemScreenY + item.height >= 0 && itemScreenY <= viewportHeight;
            
            return isInHorizontalBounds && isInVerticalBounds && isVisible;
        });

        if (!clickedItem) return;

        // Check if Ctrl key is held down (Cmd on Mac)
        if (event.ctrlKey || event.metaKey) {
            // Open artist detail page in new tab
            window.open(`/artist/${clickedItem.artist.id}`, '_blank');
        } else {
            // Normal click activates similarity mode
            onReorderBySimilarity(clickedItem.artist.id);
        }
    };

    // Handle scroll events
    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const newScrollTop = event.currentTarget.scrollTop;
        console.log('Scroll event - new scrollTop:', newScrollTop);
        setScrollTop(newScrollTop);
    };

    return (
        <div ref={containerRef} className="flex justify-center w-full px-2">
            {!isReady || !gridItems.length ? (
                <div className="p-8 text-gray-500">
                    <p>Loading artists... ({artists.length} artists received)</p>
                    {artists.length === 0 && <p>No artists data available</p>}
                </div>
            ) : (
                <div 
                    className="overflow-auto no-scrollbar"
                    style={{
                        width: canvasSize.width,
                        height: 'calc(100vh - 5rem)', // Use CSS calc for better precision
                        maxWidth: '100%'
                    }}
                    onScroll={handleScroll}
                >
                    {/* Spacer div to create scrollable height */}
                    <div style={{ height: totalContentHeight, position: 'relative' }}>
                        <canvas
                            ref={canvasRef}
                            onMouseMove={handleMouseMove}
                            onClick={handleClick}
                            style={{
                                width: canvasSize.width,
                                height: canvasSize.height,
                                position: 'sticky',
                                top: 0,
                                left: 0,
                                background: 'transparent'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtistCanvasGrid;
