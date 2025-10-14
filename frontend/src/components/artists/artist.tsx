import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import ArtistRenderer from './artist.renderer';
import IntegratedHeader from '../navigation/integrated.header';
import { Exhibition } from '../../models/exhibition.model';

const ArtistsComponent = (props: { artists: Array<Artist> }) => {

    let totalYearCount = new Map<number, number>();
    // subtract scrollbar width from window width
    const width = window.innerWidth;

    const navigate = useNavigate();

    const orders = [
        { value: 'name', label: 'Alphabetically' },
        { value: 'count', label: 'Exhibition Count' },
        { value: 'birth', label: 'Birth Year' },
        { value: 'country', label: 'Country' },
        { value: 'similarity', label: 'Timeline Similarity' }
    ];
    const [order, setOrder] = React.useState('name');
    const [artists, setArtists] = React.useState(new Array<Artist>());
    const [columnsPerRow, setColumnsPerRow] = React.useState(0); // 0 means auto-fit
    const [searchArtistId, setSearchArtistId] = React.useState<number | undefined>();
    const [similarityBaseArtist, setSimilarityBaseArtist] = React.useState<Artist | null>(null);

    useEffect(() => {
        console.log('ArtistsComponent - Props artists:', props.artists.length);
        console.log('Sample artist from props:', props.artists[0]);
        setArtists(props.artists);
    }, [props.artists]);

    const artistExhibitionCountPerYear = new Map<number, Map<number, number>>();


    // iterate through all artists and their exhibitions and keep track of the max number of exhibitions in a year
    artists.forEach((artist: Artist) => {
        // ADD ARTIST TO MAP
        artistExhibitionCountPerYear.set(artist.id, new Map<number, number>());
        artist.exhibitedAtExhibitions?.filter((exhibition: Exhibition, index, self) => self.findIndex((t) => t.id === exhibition.id) === index)
            .forEach((exhibition: Exhibition) => {
                // save count per year for each artist
                const count = totalYearCount.get(+exhibition.startdate);
                // add to artistsExhibitionCountPerYear
                const artistCount = artistExhibitionCountPerYear.get(artist.id)?.get(+exhibition.startdate);
                artistExhibitionCountPerYear.get(artist.id)?.set(+exhibition.startdate, artistCount ? artistCount + 1 : 1);
            }
            );
    });

    // get max number of exhibitions in a year from all artistExhibitionCountPerYear
    artistExhibitionCountPerYear.forEach((countMap: Map<number, number>) => {
        countMap.forEach((count: number, year: number) => {
            const max = totalYearCount.get(year);
            totalYearCount.set(year, max ? Math.max(max, count) : count);
        });
    }
    );



    // // filter for ones up to 1915
    // artists.forEach((artist: Artist) => {
    //     artist.exhibitedExhibitions?.filter((exhibition: Exhibition) => +exhibition.startdate <= 1915)
    //         .forEach((exhibition: Exhibition) => {
    //             // keep track of the max number of exhibitions in a year
    //             const count = totalYearCount.get(+exhibition.startdate);
    //             totalYearCount.set(+exhibition.startdate, count ? count + 1 : 1);

    //         });

    // });

    // ==================== SIMILARITY ANALYSIS FUNCTIONS ====================
    
    // Configuration for similarity algorithms
    const [similarityConfig, setSimilarityConfig] = React.useState({
        algorithm: 'combined', // 'combined', 'dtw', 'correlation', 'trend', 'frequency'
        normalizeValues: true,
        focusOnShape: true
    });

    // Global timeline scaling configuration
    const [timelineScaling, setTimelineScaling] = React.useState<'absolute' | 'relative'>('relative');
    // Global curve rendering configuration
    const [curveRendering, setCurveRendering] = React.useState<'jagged' | 'smooth'>('jagged');

    // Normalize timeline to focus on shape rather than absolute values
    const normalizeTimeline = (timeline: number[]): number[] => {
        if (!similarityConfig.normalizeValues) return timeline;
        
        const total = timeline.reduce((sum, val) => sum + val, 0);
        if (total === 0) return timeline.map(() => 0);
        
        // Convert to proportions to focus on shape
        return timeline.map(val => val / total);
    };

    // Z-score normalization for shape comparison
    const zScoreNormalize = (timeline: number[]): number[] => {
        const mean = timeline.reduce((sum, val) => sum + val, 0) / timeline.length;
        const variance = timeline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / timeline.length;
        const stdDev = Math.sqrt(variance);
        
        if (stdDev === 0) return timeline.map(() => 0);
        return timeline.map(val => (val - mean) / stdDev);
    };

    // Dynamic Time Warping (DTW) - excellent for shape similarity
    const dynamicTimeWarping = (series1: number[], series2: number[]): number => {
        const n = series1.length;
        const m = series2.length;
        const dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
        
        dtw[0][0] = 0;
        
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const cost = Math.abs(series1[i - 1] - series2[j - 1]);
                dtw[i][j] = cost + Math.min(
                    dtw[i - 1][j],     // insertion
                    dtw[i][j - 1],     // deletion
                    dtw[i - 1][j - 1]  // match
                );
            }
        }
        
        return dtw[n][m] / Math.max(n, m); // Normalize by length
    };

    // Pearson correlation for shape similarity
    const pearsonCorrelation = (x: number[], y: number[]): number => {
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        if (denominator === 0) return 0;
        const correlation = numerator / denominator;
        
        // Convert to distance (0 = identical, 2 = opposite)
        return 1 - correlation;
    };

    // Trend similarity - compares direction changes
    const trendSimilarity = (series1: number[], series2: number[]): number => {
        const getTrends = (series: number[]): number[] => {
            const trends = [];
            for (let i = 1; i < series.length; i++) {
                if (series[i] > series[i - 1]) trends.push(1);      // increasing
                else if (series[i] < series[i - 1]) trends.push(-1); // decreasing
                else trends.push(0);                                 // stable
            }
            return trends;
        };
        
        const trends1 = getTrends(series1);
        const trends2 = getTrends(series2);
        
        let matches = 0;
        for (let i = 0; i < Math.min(trends1.length, trends2.length); i++) {
            if (trends1[i] === trends2[i]) matches++;
        }
        
        const totalComparisons = Math.min(trends1.length, trends2.length);
        return totalComparisons === 0 ? 1 : 1 - (matches / totalComparisons);
    };

    // Frequency domain similarity using simple frequency analysis
    const frequencyDomainSimilarity = (series1: number[], series2: number[]): number => {
        // Simple peak detection and comparison
        const findPeaks = (series: number[]): number[] => {
            const peaks = [];
            for (let i = 1; i < series.length - 1; i++) {
                if (series[i] > series[i - 1] && series[i] > series[i + 1]) {
                    peaks.push(i);
                }
            }
            return peaks;
        };
        
        const peaks1 = findPeaks(series1);
        const peaks2 = findPeaks(series2);
        
        // Compare peak patterns
        const maxPeaks = Math.max(peaks1.length, peaks2.length);
        if (maxPeaks === 0) return 0;
        
        const peakDiff = Math.abs(peaks1.length - peaks2.length);
        return peakDiff / maxPeaks;
    };

    // Cross-correlation for pattern similarity
    const crossCorrelation = (x: number[], y: number[]): number => {
        let maxCorr = -1;
        const minLen = Math.min(x.length, y.length);
        
        // Try different shifts to find best alignment
        for (let shift = -minLen + 1; shift < minLen; shift++) {
            let correlation = 0;
            let count = 0;
            
            for (let i = 0; i < x.length; i++) {
                const j = i + shift;
                if (j >= 0 && j < y.length) {
                    correlation += x[i] * y[j];
                    count++;
                }
            }
            
            if (count > 0) {
                correlation /= count;
                maxCorr = Math.max(maxCorr, correlation);
            }
        }
        
        // Normalize and convert to distance
        return 1 - Math.max(0, maxCorr);
    };
    
    // Get exhibition timeline for an artist as a normalized array
    const getArtistTimeline = (artist: Artist, startYear: number = 1900, endYear: number = 2020): number[] => {
        const exhibitionsCount = new Map<number, number>();
        
        // Count exhibitions per year, removing duplicates
        artist.exhibitedAtExhibitions?.filter((exhibition, index, self) => 
            self.findIndex(e => e.id === exhibition.id) === index
        ).forEach(exhibition => {
            let year: number;
            try {
                // Handle string date formats
                if (typeof exhibition.startdate === 'string') {
                    const yearMatch = exhibition.startdate.match(/(\d{4})/);
                    year = yearMatch ? parseInt(yearMatch[1]) : parseInt(exhibition.startdate);
                } else {
                    year = +exhibition.startdate;
                }
                
                if (!isNaN(year) && year >= startYear && year <= endYear) {
                    exhibitionsCount.set(year, (exhibitionsCount.get(year) || 0) + 1);
                }
            } catch (e) {
                // Skip invalid dates
            }
        });
        
        // Create timeline array with zeros for missing years
        const timeline: number[] = [];
        for (let year = startYear; year <= endYear; year++) {
            timeline.push(exhibitionsCount.get(year) || 0);
        }
        
        // Apply normalization based on configuration
        if (similarityConfig.focusOnShape) {
            return zScoreNormalize(timeline);
        } else if (similarityConfig.normalizeValues) {
            return normalizeTimeline(timeline);
        }
        
        return timeline;
    };

    // Kullback-Leibler Divergence with smoothing
    const klDivergence = (p: number[], q: number[], smoothing: number = 0.01): number => {
        let divergence = 0;
        const totalP = p.reduce((sum, val) => sum + val, 0) + p.length * smoothing;
        const totalQ = q.reduce((sum, val) => sum + val, 0) + q.length * smoothing;
        
        for (let i = 0; i < p.length; i++) {
            const normalizedP = (p[i] + smoothing) / totalP;
            const normalizedQ = (q[i] + smoothing) / totalQ;
            divergence += normalizedP * Math.log(normalizedP / normalizedQ);
        }
        return divergence;
    };

    // Chi-Square distance
    const chiSquareDistance = (x: number[], y: number[]): number => {
        let chi = 0;
        for (let i = 0; i < x.length; i++) {
            const sum = x[i] + y[i];
            if (sum > 0) {
                chi += Math.pow(x[i] - y[i], 2) / sum;
            }
        }
        return chi / 2;
    };

    // Euclidean distance
    const euclideanDistance = (a: number[], b: number[]): number => {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    };

    // Cosine similarity (converted to distance)
    const cosineDistance = (a: number[], b: number[]): number => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        if (normA === 0 || normB === 0) return 1; // Maximum distance
        
        const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        return 1 - cosineSimilarity; // Convert to distance
    };

    // Compute similarity scores between base artist and all others
    const computeSimilarityScores = (baseArtist: Artist, allArtists: Artist[]): Map<number, number> => {
        const baseTimeline = getArtistTimeline(baseArtist);
        const scores = new Map<number, number>();
        
        console.log(`Computing similarity using algorithm: ${similarityConfig.algorithm}`);
        
        allArtists.forEach(artist => {
            const artistTimeline = getArtistTimeline(artist);
            let combinedScore = 0;
            
            switch (similarityConfig.algorithm) {
                case 'dtw':
                    combinedScore = dynamicTimeWarping(baseTimeline, artistTimeline);
                    break;
                    
                case 'correlation':
                    combinedScore = pearsonCorrelation(baseTimeline, artistTimeline);
                    break;
                    
                case 'trend':
                    combinedScore = trendSimilarity(baseTimeline, artistTimeline);
                    break;
                    
                case 'frequency':
                    combinedScore = frequencyDomainSimilarity(baseTimeline, artistTimeline);
                    break;
                    
                case 'cross_correlation':
                    combinedScore = crossCorrelation(baseTimeline, artistTimeline);
                    break;
                    
                case 'combined':
                default:
                    // Shape-focused combination for timeline patterns
                    const dtw = dynamicTimeWarping(baseTimeline, artistTimeline);
                    const correlation = pearsonCorrelation(baseTimeline, artistTimeline);
                    const trend = trendSimilarity(baseTimeline, artistTimeline);
                    const crossCorr = crossCorrelation(baseTimeline, artistTimeline);
                    const frequency = frequencyDomainSimilarity(baseTimeline, artistTimeline);
                    
                    // Weights optimized for shape similarity
                    combinedScore = 0.3 * dtw + 0.25 * correlation + 0.2 * trend + 0.15 * crossCorr + 0.1 * frequency;
                    break;
            }
            
            scores.set(artist.id, combinedScore);
        });
        
        return scores;
    };

    const orderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setArtists(new Array<Artist>());
        setOrder(event.target.value);
        const reordered = reorder(event.target.value);
        setArtists(reordered)
    }

    // Improved similarity-based reordering function
    const reorderArtistBySimilarity = (baseArtistId: number) => {
        console.log('Reordering by similarity to artist ID:', baseArtistId);
        
        const baseArtist = artists.find(artist => artist.id === baseArtistId);
        if (!baseArtist) {
            console.warn('Base artist not found for similarity comparison');
            return;
        }
        
        setSimilarityBaseArtist(baseArtist);
        const scores = computeSimilarityScores(baseArtist, artists);
        
        // Sort artists by similarity score (lower score = more similar)
        const sortedArtists = [...artists].sort((a, b) => {
            const aScore = scores.get(a.id) || Infinity;
            const bScore = scores.get(b.id) || Infinity;
            return aScore - bScore;
        });
        
        console.log('Similarity scores computed for', scores.size, 'artists');
        setArtists(sortedArtists);
        setOrder('similarity'); // Update the order state
    };

    const reorder = (order: string): Array<Artist> => {
        let objects = [...artists]; // need a copy here to avoid read-only errors
        switch (order) {
            case 'name':
                objects.sort((a: Artist, b: Artist) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`));
                break;
            case 'count':
                objects.sort((a: Artist, b: Artist) => {
                    return a.exhibitedAtExhibitions && b.exhibitedAtExhibitions ? b.exhibitedAtExhibitions.length - a.exhibitedAtExhibitions.length : 0;
                });
                break;  
            case 'birth':
                objects.sort((a: Artist, b: Artist) => {
                    const aYear = a.birthyear || 0;
                    const bYear = b.birthyear || 0;
                    return aYear - bYear;
                });
                break;
            case 'country':
                objects.sort((a: Artist, b: Artist) => {
                    const aCountry = a.country || '';
                    const bCountry = b.country || '';
                    return aCountry.localeCompare(bCountry);
                });
                break;
            case 'similarity':
                // For similarity, artists are already sorted when the base artist is selected
                // If no base artist is selected, fall back to alphabetical
                if (!similarityBaseArtist) {
                    objects.sort((a: Artist, b: Artist) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`));
                }
                // Otherwise, keep current order as it was set by similarity calculation
                break;
            default:
                break;
        }
        return objects;
    }

    const xExt = d3.extent(Array.from(totalYearCount.keys()));
    const yExt = d3.extent(Array.from(totalYearCount.values()));

    return (
        <>
            <IntegratedHeader
                artists={reorder(order)}
                order={order}
                onOrderChange={setOrder}
                columnsPerRow={columnsPerRow}
                onColumnsChange={setColumnsPerRow}
                onSearchArtist={setSearchArtistId}
                similarityBaseArtist={similarityBaseArtist}
                onClearSimilarity={() => { 
                    setOrder('name'); 
                    setSimilarityBaseArtist(null); 
                }}
                similarityConfig={similarityConfig}
                onSimilarityConfigChange={(newConfig) => {
                    setSimilarityConfig(newConfig);
                    if (similarityBaseArtist) {
                        setTimeout(() => reorderArtistBySimilarity(similarityBaseArtist.id), 100);
                    }
                }}
                timelineScaling={timelineScaling}
                onTimelineScalingChange={setTimelineScaling}
                curveRendering={curveRendering}
                onCurveRenderingChange={setCurveRendering}
            />

            {/* Top padding to account for fixed header - extra padding to ensure borders are visible */}
            <div className="pt-16 flex flex-wrap items-center justify-center w-full px-2">
                <ArtistRenderer 
                    artists={reorder(order)} 
                    onReorderBySimilarity={reorderArtistBySimilarity}
                    navigate={navigate}
                    useCanvas={true}
                    forcedColumnsPerRow={columnsPerRow}
                    searchArtistId={searchArtistId}
                    similarityBaseArtist={similarityBaseArtist || undefined}
                    timelineScaling={timelineScaling}
                    curveRendering={curveRendering}
                />
            </div>
        </>
    );
};

export default ArtistsComponent;