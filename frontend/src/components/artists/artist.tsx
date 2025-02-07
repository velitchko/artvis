import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import ArtistCardComponent from './artist.card';
import { Exhibition } from '../../models/exhibition.model';

const ArtistsComponent = (props: { artists: Array<Artist> }) => {

    let totalYearCount = new Map<number, number>();
    // subtract scrollbar width from window width
    const width = window.innerWidth;
    const chartCount = 7;

    const navigate = useNavigate();

    const orders = [
        { value: 'name', label: 'Alphabetically' },
        { value: 'count', label: 'Exhibition Count' },
        // { value: 'chi', label: 'Similarity' }
    ];
    const [order, setOrder] = React.useState('name'); // 'name', 'count', 'chi'
    const [artists, setArtists] = React.useState(new Array<Artist>());

    // calculate how much the width of each chart should be to fix
    const chartWidth = width / chartCount;

    useEffect(() => {
        setArtists(props.artists);
    }, props.artists);

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

    // Function to compute the Kullback-Leibler Divergence between two distributions with 0 division check
    const klDivergence = (p: Array<number>, q: Array<number>, smoothing: number = 0.01) => {
        let divergence = 0;
        for (let i = 0; i < p.length; i++) {
            // Additive smoothing to avoid zero probabilities
            const smoothedP = p[i] + smoothing;
            const smoothedQ = q[i] + smoothing;

            // Update KL divergence
            divergence += smoothedP * Math.log(smoothedP / smoothedQ);
        }
        return divergence;
    }


    const chiSquare = (x: Array<number>, y: Array<number>) => {
        let chi = 0;
        for (let i = 0; i < x.length; i++) {
            if (Math.pow(x[i] + y[i], 2) === 0) {
                continue; // avoid division by 0
            }
            chi += Math.pow(x[i] - y[i], 2) / Math.pow(x[i] + y[i], 2);
        }

        return chi / 2;
    }

    // Euclidean distance function
    const euclideanDistance = (a: Array<number>, b: Array<number>) => {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += Math.pow(a[i] - b[i], 2);
        }
        return Math.sqrt(sum);
    }

   // Function to compute the distance matrix based on similarity scores
const computeDistanceMatrix = (similarityScores: Array<Array<number>>) => {
    const n = similarityScores.length;
    const distanceMatrix = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const score1 = similarityScores[i][1];
            const score2 = similarityScores[j][1];
            // Assuming similarity scores are between 0 and 1, compute distance as absolute difference
            const distance = Math.abs(score1 - score2);
            distanceMatrix[i][j] = distanceMatrix[j][i] = distance;
        }
    }

    return distanceMatrix;
}
// Function to perform hierarchical clustering
const hierarchicalClustering = (similarityScores: Array<Array<number>>) => {
    const distanceMatrix = computeDistanceMatrix(similarityScores);
    const n = similarityScores.length;

    // Initialize clusters
    const clusters = [];
    for (let i = 0; i < n; i++) {
        clusters.push([similarityScores[i][0]]); // Each data point is initially its own cluster
    }

    // Perform agglomerative clustering
    while (clusters.length > 1) {
        // Find the closest pair of clusters
        let minDistance = Infinity;
        let closestClusters = new Array<number>();
        for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                const cluster1 = clusters[i];
                const cluster2 = clusters[j];
                let maxDistance = -1;
                // Compute the maximum distance between any two points in the two clusters
                for (const point1 of cluster1) {
                    for (const point2 of cluster2) {
                        const idx1 = similarityScores.findIndex(item => item[0] === point1);
                        const idx2 = similarityScores.findIndex(item => item[0] === point2);
                        const dist = distanceMatrix[idx1][idx2];
                        if (dist > maxDistance) {
                            maxDistance = dist;
                        }
                    }
                }
                if (maxDistance < minDistance) {
                    minDistance = maxDistance;
                    closestClusters = [i, j];
                }
            }
        }

        // Merge the closest clusters
        const mergedCluster: any = clusters[closestClusters[0]].concat(clusters[closestClusters[1]]);
        clusters.splice(closestClusters[1], 1);
        clusters.splice(closestClusters[0], 1);
        clusters.push(mergedCluster);
    }

    return clusters;
}

    const orderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setArtists(new Array<Artist>());
        setOrder(event.target.value);
        const reordered = reorder(event.target.value);
        setArtists(reordered)
    }

    const reorderArtistBySim = (id: number) => {
        let objects = [...artists]; // need a copy here to avoide read-only errors

        setArtists(new Array<Artist>());

        const baseArtist = objects.find((artist: Artist) => artist.id === id);
        const aExhibitions = baseArtist?.exhibitedAtExhibitions?.filter((exhibition: Exhibition, index: number, self) => self.findIndex((t) => t.id === exhibition.id) === index)
            .map((exhibition: Exhibition) => +exhibition.startdate);
        const aExhibitionsCount = new Map<number, number>();
        aExhibitions?.filter((year: number) => year <= 1915)
            .forEach((year: number) => {
                const count = aExhibitionsCount.get(year);
                aExhibitionsCount.set(year, count ? count + 1 : 1)
            });

        for (let i = 1905; i <= 1915; i++) {
            if (!aExhibitionsCount.has(i)) {
                aExhibitionsCount.set(i, 0);
            }
        }
        // sort map according to key
        const sortedAExhibCount = new Map([...aExhibitionsCount.entries()].sort());
        const aExhibitionsCountArray = Array.from(sortedAExhibCount.values());

        const scores = new Map<number, number>();

        objects.forEach((b: Artist) => {
            // const aExhibitions = a.exhibitedExhibitions?.map((exhibition: Exhibition) => exhibition.startdate);
            const bExhibitions = b.exhibitedAtExhibitions?.filter((exhibition: Exhibition, index: number, self) => self.findIndex((t) => t.id === exhibition.id) === index)
                .map((exhibition: Exhibition) => +exhibition.startdate);
            // const aExhibitionsCount = new Map<number, number>();
            const bExhibitionsCount = new Map<number, number>();
            // aExhibitions?.forEach((year: number) => {
            //     const count = aExhibitionsCount.get(year);
            //     aExhibitionsCount.set(year, count ? count + 1 : 1)
            // });
            bExhibitions?.filter((year: number) => year <= 1915)
                .forEach((year: number) => {
                    const count = bExhibitionsCount.get(year);
                    bExhibitionsCount.set(year, count ? count + 1 : 1)
                });

            // fill in missing years from 1905-1915
            for (let i = 1905; i <= 1915; i++) {
                // if (!aExhibitionsCount.has(i)) {
                //     aExhibitionsCount.set(i, 0);
                // }
                if (!bExhibitionsCount.has(i)) {
                    bExhibitionsCount.set(i, 0);
                }
            }

            //sort map according to key
            const sortedBExhibCount = new Map([...bExhibitionsCount.entries()].sort());
            const bExhibitionsCountArray = Array.from(sortedBExhibCount.values());

            const chi = chiSquare(aExhibitionsCountArray, bExhibitionsCountArray);
            const kl = klDivergence(aExhibitionsCountArray, bExhibitionsCountArray);

            scores.set(b.id, Math.abs(kl));
            // return chi;
        });

        const sorted = new Map([...scores.entries()].sort((a, b) => a[1] - b[1]))
        // do clustering with the scores
        const similarityScores = Array.from(sorted).map(([id, score]) => [+id, score]);
        const clusters = hierarchicalClustering(similarityScores);
        console.log(clusters);

        // sort objects by chi score
        objects.sort((a: Artist, b: Artist) => {
            const aScore = sorted.get(a.id);
            const bScore = sorted.get(b.id);

            if (aScore === undefined || bScore === undefined) {
                // never happens
                return 0;
            }
            return aScore - bScore;
        });

        setArtists(objects)
    }

    const reorder = (order: string): Array<Artist> => {
        let objects = [...artists]; // need a copy here to avoide read-only errors
        switch (order) {
            case 'name':
                objects.sort((a: Artist, b: Artist) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`));
                break;
            case 'count':
                objects.sort((a: Artist, b: Artist) => {
                    return a.exhibitedAtExhibitions && b.exhibitedAtExhibitions ? a.exhibitedAtExhibitions.length - b.exhibitedAtExhibitions.length : 0;
                });
                break;  
            case 'age':
                break;
            case 'country':
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
            <div className="absolute top-4 right-6">
                <select className="flex-shrink-0 z-10 inline-flex items-center py-2 px-4 text-sm font-medium text-center bg-black text-white border border-gray-300" id="lang" onChange={orderChange} value={order}>
                    {
                        orders.map(o => (
                            <option key={o.value} value={o.value} className="inline-flex w-full px-4 py-2 text-sm text-white bg-black hover:bg-gray-100">{o.label}</option>
                        ))
                    }
                </select>
            </div>

            <div className="flex flex-wrap items-center justify-center w-full">
                {artists && artists.map((artist: Artist) => {
                    return <ArtistCardComponent artist={artist} key={artist.id} width={chartWidth} height={150} yearExtent={xExt} countExtent={yExt} navigate={navigate} reorderSim={reorderArtistBySim} />;
                })}
            </div>
            <nav aria-label="Page navigation example">
                <ul className="list-style-none flex">
                    <li>
                        <a
                            className="relative block rounded bg-black text-m text-white transition-all duration-300 hover:bg-white dark:text-white dark:hover:bg-neutral-700 dark:hover:text-white"
                            href="#"
                            aria-label="Previous">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
                    <li>
                        <a
                            className="relative block rounded px-6 py- bg-black text-m text-white transition-all duration-300 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-700 dark:hover:text-white"
                            href="#">1</a>
                    </li>
                    <li aria-current="page">
                        <a
                            className="relative block rounded bg-black text-m text-white transition-all duration-300 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-700 dark:hover:text-white"
                            href="#">2</a>
                    </li>
                    <li>
                        <a
                            className="relative block rounded bg-black text-m text-white transition-all duration-300 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-700 dark:hover:text-white"
                            href="#">3</a>
                    </li>
                    <li>
                        <a
                            className="relative block rounded bg-black text-m text-white transition-all duration-300 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-700 dark:hover:text-white"
                            href="#"
                            aria-label="Next"><span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
        </>
    );
};

export default ArtistsComponent;