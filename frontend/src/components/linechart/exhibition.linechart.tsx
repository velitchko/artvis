import React, { Ref } from 'react';
import _, { Dictionary, min } from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
import client from '../apollo/client';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/exhibitedWith';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
//import data from '../../resources/map.geo.json';
import data from '../../resources/complete-map.geo.json';
import { Host } from '../../models/host.model';
import { CatalogueEntry } from '../../models/catalogueEntry.model';
import GET_EXHIBITIONS_BY_ARTIST from '../../queries/exhibitionsByArtist';

type MetaExhibition = Exhibition & { isCommon: boolean, artworksTotal: number, artworksBase: number, percentCompare: number, percentBase: number };

class ExhibitionLinechartComponent extends React.Component<{ compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width?: number, height?: number, mouseOverCallBack?: Function }, { compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }> {

    private svgTimeLineContainer: d3.Selection<any, any, any, any> | undefined;
    private baseTimelineContainer: d3.Selection<any, any, any, any> | undefined;
    private compareTimelineContainer: d3.Selection<any, any, any, any> | undefined;

    private svgContainer: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined;
    private circleContainer: d3.Selection<any, any, any, any> | undefined;
    private borderContainer: d3.Selection<any, any, any, any> | undefined;

    private xAxis: d3.Selection<any, any, any, any> | undefined;
    private yAxis: d3.Selection<any, any, any, any> | undefined;
    private yAxisTotal: d3.Selection<any, any, any, any> | undefined;

    private tooltip: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScaleTotal: d3.ScaleLinear<number, number, never> | undefined;
    private rScale: d3.ScalePower<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };
    private baseItemCountExtentAbs: [number, number];
    private baseItemCountExtentAvg: [number, number];
    private compareItemCountExtentAbs: [number, number];
    private compareItemCountExtentAvg: [number, number];

    private width: number = 500;
    private height: number = 0;
    private minYear: number = 0;
    private maxYear: number = 0;

    private exhibitions: Array<Exhibition> = [];
    private exhibStats: Array<MetaExhibition> = [];
    private commonExhibitions: Array<MetaExhibition> = [];

    constructor(props: { compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }) {

        super(props);

        this.state = {
            width: props.width,
            height: props.height,
            coEx: 3,
            selection: false,
            exhibitions: props.exhibitions,
            compareWith: props.compareWith,
            //exhibitionMap: props.exhibitionMap
            exhibStatistics: props.exhibStatistics
        };

        this.svgTimeLineContainer = undefined;
        this.tooltip = undefined;



        this.xScale = undefined;
        this.yScale = undefined;
        this.yScaleTotal = undefined;

        this.baseItemCountExtentAbs = [0, 0];
        this.baseItemCountExtentAvg = [0, 0];
        this.compareItemCountExtentAbs = [0, 0];
        this.compareItemCountExtentAvg = [0, 0];

        this.width = 500;
        this.height = 128;

        this.minYear = 1905;
        this.maxYear = 1915;

        this.margin = {
            top: 35,
            //top: 30,
            bottom: 10,
            //bottom: 50,
            left: 10,
            right: 30
        };
    }


    init(): void {

        const timeline = this.svgTimeLineContainer?.select('.artistinfo-container');

        if (timeline) return;

        this.svgTimeLineContainer = d3.select('#artist-detail-timeline')
            .attr('width', this.state.width)
            .attr('height', this.state.height)
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('overflow', 'visible');

        this.svgTimeLineContainer.append('g')
            .attr('class', 'artistinfo-container')
            .append('rect')
            .attr('id', 'timeline-background')
            .attr('fill', 'transparent');

        this.baseTimelineContainer = this.svgTimeLineContainer.select('.artistinfo-container').append('g').attr('id', 'base-timeline');
        this.compareTimelineContainer = this.svgTimeLineContainer.select('.artistinfo-container').append('g').attr('id', 'compare-timeline');


        this.xScale = d3.scaleLinear<number, number, never>().range([this.margin.left * 2, this.state.width - (this.margin.right / 2)]);
        this.yScale = d3.scaleLinear<number, number, never>().range([this.state.height - this.margin.top, this.margin.top]);
        this.yScaleTotal = d3.scaleLinear<number, number, never>().range([this.state.height - this.margin.top, this.margin.top]);
        this.rScale = d3.scaleSqrt<number, number, never>().range([10, 30]);

        // add tooltip
        this.tooltip = this.svgTimeLineContainer.append('g').attr('id', 'line-tooltip');
        // add axis
        this.xAxis = this.svgTimeLineContainer.append('g');
        this.yAxis = this.svgTimeLineContainer.append('g');

        this.xAxis
            //.attr('transform', `translate(0, ${this.state.height - this.margin.bottom})`)
            .attr('transform', `translate(0, ${this.margin.bottom})`)
            .attr('class', 'x-axis');

        this.yAxis
            .attr('transform', `translate(${this.margin.left}, 0)`)
            .attr('class', 'y-axis');

        /* this.svgTimeLineContainer.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', this.state.width / 2)
            .attr('y', this.state.height - this.margin.bottom + 36)
            .attr('text-anchor', 'middle')
            .text('Year');

        this.svgTimeLineContainer.append('text')
            .attr('class', 'y-axis-label')
            .attr('x', -this.state.height / 2)
            .attr('y', this.margin.left / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Exhibitions'); */

        // add title
        /* this.svgTimeLineContainer.append('text')
            .attr('class', 'title')
            .attr('x', this.state.width / 2)
            .attr('y', -this.margin.top)
            .attr('text-anchor', 'middle')
            .text('Exhibitions over time'); */

        this.exhibStats = [...this.state.exhibStatistics];

        this.drawTimeline();


    }


    //drawTimeline(update?: { newYScale?: number, newRScale?: Array<number> }) {
    drawTimeline(update?: { newYScale?: number, newYScaleTotal?: number }) {
        if (!this.svgTimeLineContainer) return;

        if (!this.exhibStats) return;

        // draw timeline of artists and their exhibitions over time
        // iterate over exhibitions array and calculate total amount of exhibitions per year
        //const exhibitionsPerYear = new Map<number, Set<string>>();
        const artworksPerYear = new Map<number, number>();
        const exhibsPerYear = new Map<number, number>();
        const artworksPerYearTotal = new Map<number, number>();

        //find number of artworks and exhibitions for artist per year
        this.exhibStats.forEach((exhibition: MetaExhibition) => {
            const year = +exhibition.startdate;
            // if (exhibitionsPerYear.has(year)) {
            //     exhibitionsPerYear.get(year)?.add(exhibition.id);
            // } else {
            //     exhibitionsPerYear.set(year, new Set<string>([exhibition.id]));
            // }

            if (artworksPerYear.has(year)) {
                const count = artworksPerYear.get(year) || 0;
                artworksPerYear.set(year, count + exhibition.artworksBase);
            } else {
                artworksPerYear.set(year, exhibition.artworksBase);
            }

            if (artworksPerYearTotal.has(year)) {
                const count = artworksPerYearTotal.get(year) || 0;
                artworksPerYearTotal.set(year, count + exhibition.artworksTotal);
            } else {
                artworksPerYearTotal.set(year, exhibition.artworksTotal);
            }

            if (exhibsPerYear.has(year)) {
                const count = exhibsPerYear.get(year) || 0;
                exhibsPerYear.set(year, count + 1);
            } else {
                exhibsPerYear.set(year, 1);
            }
        });

        // console.log("items per year");
        // console.log(exhibsPerYear);

        // console.log(artworksPerYear);
        // console.log(artworksPerYearTotal);

        const averageArtworks = new Map<number, number>();
        const averageArtworksTotal = new Map<number, number>();

        for (let yr = 1905; yr <= 1915; yr++) {
            if (artworksPerYear.has(yr)) {
                const awPerY = artworksPerYear.get(yr) || 0;
                const exPerY = exhibsPerYear.get(yr) || 0;
                const totalPerY = artworksPerYearTotal.get(yr) || 0;
                if (exPerY != 0) {
                    averageArtworks.set(yr, awPerY / exPerY);
                    averageArtworksTotal.set(yr, totalPerY / exPerY);
                }
            }
            else {
                averageArtworks.set(yr, 0);
                averageArtworksTotal.set(yr, 0);
            }

        }

        // console.log("linechart data: ");
        // console.log(averageArtworks);
        // console.log(averageArtworksTotal);

        //const itemsPerYearCumulated = new Map<number, number>();
        //const itemsPerYearTotalCumulated = new Map<number, number>();

        //sort exhibitions by year
        //this.exhibStats.sort((a, b) => { return a.startdate - b.startdate });
        //console.log("sorted stats linechart");
        //console.log(this.exhibStats);


        /* let highestBaseCount = 0;
        let highestTotalCount = 0;

        this.exhibStats.forEach((exhibition: MetaExhibition) => {
            const year = +exhibition.startdate;

            //if year is not between min and max year (1905-1915), take next exhibition
            if (year < this.minYear || year > this.maxYear) return;

            //the exhibitions are from the same year
            // if (year === yr) {            

            if (itemsPerYearCumulated.has(year)) {
                const count = itemsPerYearCumulated.get(year) || 0;
                highestBaseCount = count + exhibition.artworksBase;
                itemsPerYearCumulated.set(year, count + exhibition.artworksBase);
            } else {
                //1905
                if (year === 1905) {
                    itemsPerYearCumulated.set(year, exhibition.artworksBase);
                }
                //other years
                else {

                    itemsPerYearCumulated.set(year, highestBaseCount + exhibition.artworksBase);
                    highestBaseCount = highestBaseCount + exhibition.artworksBase;


                }
            }

            if (itemsPerYearTotalCumulated.has(year)) {
                const count = itemsPerYearTotalCumulated.get(year) || 0;
                highestTotalCount = count + exhibition.artworksTotal;
                itemsPerYearTotalCumulated.set(year, count + exhibition.artworksTotal);
            } else {
                //1905
                if (year === 1905) {
                    itemsPerYearTotalCumulated.set(year, exhibition.artworksTotal);
                }
                //other years
                else {
                    itemsPerYearTotalCumulated.set(year, highestTotalCount + exhibition.artworksTotal);
                    highestTotalCount = highestTotalCount + exhibition.artworksTotal;
                }
            }

        }); */

        /* highestBaseCount = 0;
        highestTotalCount = 0;

        for (let yr = 1905; yr <= 1915; yr++) {
            if (itemsPerYearCumulated.has(yr)) {
                highestBaseCount = itemsPerYearCumulated.get(yr) || 0;
            }
            else {
                itemsPerYearCumulated.set(yr, highestBaseCount);
            }

            if (itemsPerYearTotalCumulated.has(yr)) {
                highestTotalCount = itemsPerYearTotalCumulated.get(yr) || 0;
            }
            else {
                itemsPerYearTotalCumulated.set(yr, highestTotalCount);
            }
        }




        console.log("linechart data");
        console.log(itemsPerYearCumulated);
        console.log(itemsPerYearTotalCumulated); */


        // convert exhibitions by year from number, Set<string> to number, number (count)
        //const exhibitionData = [...exhibitionsPerYear].map(([year, set]) => ({ year, count: set.size })).sort((a, b) => a.year - b.year);

        //const itemsData = [...itemsPerYearCumulated].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        //const itemsTotalData = [...itemsPerYearTotalCumulated].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        const itemsData = [...averageArtworks].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        const itemsTotalData = [...averageArtworksTotal].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        // convert items by year to array
        //const itemsData = [...itemsPerYear].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        // merge arrays exhibitionData and itemsData 
        /* const data = itemsData.map((exhibition: { year: number, count: number }) => {
            const items = itemsTotalData.find((item: { year: number, count: number }) => item.year === exhibition.year);
            if (items) {
                return { year: exhibition.year, exhibitions: exhibition.count, items: items.count };
            } else {
                return { year: exhibition.year, exhibitions: exhibition.count, items: 0 };
            }
        });
 */
        //this.baseItemCountExtentAbs = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items) as [number, number];
        //this.baseItemCountExtentAvg = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items / d.exhibitions) as [number, number];

        this.baseItemCountExtentAbs = d3.extent(itemsTotalData, (d: { year: number, count: number }) => d.count) as [number, number];
        this.baseItemCountExtentAvg = d3.extent(itemsTotalData, (d: { year: number, count: number }) => d.count / 15) as [number, number];


        if (!itemsData.length) return;

        this.xScale?.domain([this.minYear, this.maxYear]);

        // const years: Array<number> = Array.from(Array(this.maxYear - this.minYear + 1).keys()).map((i) => i + this.minYear);

        /* const dataWithMissingYears: Array<{ year: number, exhibitions: number, items: number }> = years.map((year: number) => {
            const yearData = data.find((d: { year: number, exhibitions: number, items: number }) => {
                return d.year === year
            });
            if (yearData) {
                return yearData;
            } else {
                return { year, exhibitions: 0, items: 0 };
            }
        }); */

        const yExt = d3.extent(itemsData, (d: { year: number, count: number }) => d.count);
        const yExtTotal = d3.extent(itemsTotalData, (d: { year: number, count: number }) => d.count);

        // // this.yScale?.domain(this.state.countExtent as Array<number>);
        update && update.newYScale ? this.yScale?.domain([0, update.newYScale]) : this.yScale?.domain([0, yExt[1] as number]);
        update && update.newYScaleTotal ? this.yScaleTotal?.domain([0, update.newYScaleTotal]) : this.yScaleTotal?.domain([0, yExtTotal[1] as number]);

        const rExt = [Math.min(this.baseItemCountExtentAbs[0], this.baseItemCountExtentAvg[0]), Math.max(this.baseItemCountExtentAbs[1], this.baseItemCountExtentAvg[1])];

        // if (update && update.newRScale) {
        //     this.rScale?.domain([update.newRScale[0], update.newRScale[1]])
        // } else {
        //     this.rScale?.domain(rExt as Array<number>);
        // }



        /* const lineGenerator = d3.line<{ year: number, exhibitions: number, items: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, exhibitions: number, items: number }) => {
                return this.xScale ? this.xScale(d.year) : 0;
            })
            .y((d: { year: number, exhibitions: number, items: number }) => this.yScale ? this.yScale(d.exhibitions) : 0); */

        if (!this.baseTimelineContainer) return;

        const paths = this.baseTimelineContainer.selectAll('.base-path');

        const lineGenerator = d3.line<{ year: number, count: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, count: number }) => {
                return this.xScale ? this.xScale(d.year) : 0;
            })
            .y((d: { year: number, count: number }) => this.yScale ? this.yScale(d.count) : 0);


        const lineGeneratorTotal = d3.line<{ year: number, count: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, count: number }) => {
                return this.xScale ? this.xScale(d.year) : 0;
            })
            .y((d: { year: number, count: number }) => this.yScaleTotal ? this.yScaleTotal(d.count) : 0);

        const pathsTotal = this.baseTimelineContainer.selectAll('.total-path');

        //console.log("normal scales");
        //console.log(update?.newYScale + " " + this.yScale?.domain()[1] + " " + update?.newYScaleTotal + " " + this.yScaleTotal?.domain()[1]);


        pathsTotal
            .data(itemsTotalData)
            .join('path')
            .attr('d', lineGeneratorTotal.bind(this)(itemsTotalData))
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.05)
            .attr('fill', 'none');
        pathsTotal.exit().remove();


        paths
            .data(itemsData)
            .join('path')
            .attr('d', lineGenerator.bind(this)(itemsData))
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('stroke', '#1f77b4')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.05)
            .attr('fill', 'none');
        paths.exit().remove();








        // add axis
        /* const xAxis = d3.axisBottom(this.xScale as d3.AxisScale<number>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        // format ticks
        xAxis.tickFormat(d3.format('d'));
        yAxis.tickFormat(d3.format('d')).ticks(this.yScale?.domain()[1] as number);

        this.xAxis?.call(xAxis);
        this.yAxis?.call(yAxis); */
    }

    drawCompare(artist: Artist) {
        // console.log("comparewith");

        // console.log(this.props.compareWith);

        // draw bars on each year to compare with other artist
        if (!this.svgTimeLineContainer) return;

        //if (!this.state.artist.exhibitedExhibitions) return;

        //if (!this.props.compareWith) return;

        if (!artist) return;

        // console.log("compare linechart");

        // const timeline = this.svgTimeLineContainer.select('.timeline-container').append('g').attr('id', 'compare-timeline');

        let compExhibStats = new Array<MetaExhibition>();
        let exhibMap: Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>> = new Map<string, Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>>();


        artist.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
            //this.props.compareWith?.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {

            const year = +exhibition.startdate;
            const key = `${exhibition.id}`;

            const baseLength = exhibition.catalogueEntriesEntryIn?.filter((entry: CatalogueEntry) => entry.id_person !== '\\N').length;

            //TODO: entries == artworksCount but easier computation. --> remove artworksCount + rename entries to artworksCount
            // get amount of catalogueEntries with id_person === id
            const entries = exhibition.catalogueEntriesEntryIn?.filter((entry: CatalogueEntry) => entry.id_person === this.state.compareWith?.id)?.length;

            // calculate percentage
            const percentage = (entries / baseLength) * 100;


            //if the exhibition id is already in the map, increase artworks count by 1
            if (exhibMap.has(key)) {

                const value = exhibMap.get(key) as Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>;

                const artwCount = Array.from(value).find((d: { year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }) => d.year === year);;

                const awCount = artwCount?.artworksCount;

                if (awCount) {
                    let artworksCount = +awCount.toString();
                    value.clear();
                    artworksCount = artworksCount + 1;
                    value.add({ year, exhibition, artworksCount, baseLength, entries, percentage })
                }

                //if the exhibition isn't in the map yet, put it in the map
            } else {
                const artworksCount = 1;
                exhibMap.set(key, new Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>([{ year, exhibition, artworksCount, baseLength, entries, percentage }]));
            }
        });


        // console.log("exhib map linecharts");
        // console.log(exhibMap);
        let i: number = 0;

        exhibMap.forEach((value: Set<{ year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }>, key: string) => {


            value.forEach((item: { year: number, exhibition: Exhibition, artworksCount: number, baseLength: number, entries: number, percentage: number }) => {

                const exhib: MetaExhibition = { ...item.exhibition, artworksTotal: item.baseLength, artworksBase: item.artworksCount, isCommon: false, percentBase: item.percentage, percentCompare: 0 };

                compExhibStats.push(exhib);

            });


        });


        // console.log("compare exhibstats");
        // console.log(compExhibStats);

        const compareArtworksPerYear = new Map<number, number>();
        const compareExhibsPerYear = new Map<number, number>();
        const compareArtworksPerYearTotal = new Map<number, number>();

        //find number of artworks and exhibitions for artist per year
        compExhibStats.forEach((exhibition: MetaExhibition) => {
            const year = +exhibition.startdate;
            // if (exhibitionsPerYear.has(year)) {
            //     exhibitionsPerYear.get(year)?.add(exhibition.id);
            // } else {
            //     exhibitionsPerYear.set(year, new Set<string>([exhibition.id]));
            // }

            if (compareArtworksPerYear.has(year)) {
                const count = compareArtworksPerYear.get(year) || 0;
                compareArtworksPerYear.set(year, count + exhibition.artworksBase);
            } else {
                compareArtworksPerYear.set(year, exhibition.artworksBase);
            }

            if (compareArtworksPerYearTotal.has(year)) {
                const count = compareArtworksPerYearTotal.get(year) || 0;
                compareArtworksPerYearTotal.set(year, count + exhibition.artworksTotal);
            } else {
                compareArtworksPerYearTotal.set(year, exhibition.artworksTotal);
            }

            if (compareExhibsPerYear.has(year)) {
                const count = compareExhibsPerYear.get(year) || 0;
                compareExhibsPerYear.set(year, count + 1);
            } else {
                compareExhibsPerYear.set(year, 1);
            }
        });

        // console.log("items per year");
        // console.log(compareExhibsPerYear);

        // console.log(compareArtworksPerYear);
        // console.log(compareArtworksPerYearTotal);

        const compareAverageArtworks = new Map<number, number>();
        const compareAverageArtworksTotal = new Map<number, number>();

        for (let yr = 1905; yr <= 1915; yr++) {
            if (compareArtworksPerYear.has(yr)) {
                const awPerY = compareArtworksPerYear.get(yr) || 0;
                const exPerY = compareExhibsPerYear.get(yr) || 0;
                const totalPerY = compareArtworksPerYearTotal.get(yr) || 0;
                if (exPerY != 0) {
                    compareAverageArtworks.set(yr, awPerY / exPerY);
                    compareAverageArtworksTotal.set(yr, totalPerY / exPerY);
                }
            }
            else {
                compareAverageArtworks.set(yr, 0);
                compareAverageArtworksTotal.set(yr, 0);
            }

        }

        // console.log("linechart data: ");
        // console.log(compareAverageArtworks);
        // console.log(compareAverageArtworksTotal);




        const compareItemsData = [...compareAverageArtworks].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        const compareItemsTotalData = [...compareAverageArtworksTotal].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        // convert items by year to array
        //const itemsData = [...itemsPerYear].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        // merge arrays exhibitionData and itemsData 
        /* const data = itemsData.map((exhibition: { year: number, count: number }) => {
            const items = itemsTotalData.find((item: { year: number, count: number }) => item.year === exhibition.year);
            if (items) {
                return { year: exhibition.year, exhibitions: exhibition.count, items: items.count };
            } else {
                return { year: exhibition.year, exhibitions: exhibition.count, items: 0 };
            }
        });
 */
        //this.baseItemCountExtentAbs = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items) as [number, number];
        //this.baseItemCountExtentAvg = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items / d.exhibitions) as [number, number];

        this.baseItemCountExtentAbs = d3.extent(compareItemsTotalData, (d: { year: number, count: number }) => d.count) as [number, number];
        this.baseItemCountExtentAvg = d3.extent(compareItemsTotalData, (d: { year: number, count: number }) => d.count / 15) as [number, number];


        if (!compareItemsData.length) return;

        this.xScale?.domain([this.minYear, this.maxYear]);

        // const years: Array<number> = Array.from(Array(this.maxYear - this.minYear + 1).keys()).map((i) => i + this.minYear);

        /* const dataWithMissingYears: Array<{ year: number, exhibitions: number, items: number }> = years.map((year: number) => {
            const yearData = data.find((d: { year: number, exhibitions: number, items: number }) => {
                return d.year === year
            });
            if (yearData) {
                return yearData;
            } else {
                return { year, exhibitions: 0, items: 0 };
            }
        }); */

        const yExt = d3.extent(compareItemsData, (d: { year: number, count: number }) => d.count);
        const yExtTotal = d3.extent(compareItemsTotalData, (d: { year: number, count: number }) => d.count);

        // // this.yScale?.domain(this.state.countExtent as Array<number>);
        /* update && update.newYScale ? this.yScale?.domain([0, update.newYScale]) : this.yScale?.domain([0, yExt[1] as number]);
        update && update.newYScale ? this.yScaleTotal?.domain([0, update.newYScale]) : this.yScaleTotal?.domain([0, yExtTotal[1] as number]);
 */
        //const rExt = [Math.min(this.baseItemCountExtentAbs[0], this.baseItemCountExtentAvg[0]), Math.max(this.baseItemCountExtentAbs[1], this.baseItemCountExtentAvg[1])];


        // check if count is higher than base artist and draw line
        const compareYMax = d3.max(compareItemsTotalData, (d: { year: number, count: number }) => d.count) as number;
        //const baseYMax = this.yScale?.domain()[1] as number;
        const baseYMax = this.yScaleTotal?.domain()[1] as number;

        const compareY = d3.max(compareItemsData, (d: { year: number, count: number }) => d.count) as number;
        const baseY = this.yScale?.domain()[1] as number;


        /* console.log("max base");
        console.log(compareY + " " + baseY);

        console.log("max total");
        console.log(compareYMax + " " + baseYMax); */

        //let update: { newYScale?: number, newRScale?: Array<number> } | undefined = undefined;
        let update: { newYScale?: number, newYScaleTotal?: number } | undefined = undefined;
        update = {};

        if ((compareY !== baseY) || (compareYMax !== baseYMax)) {
            //           update = {};
            update.newYScale = Math.max(compareY, baseY);
            update.newYScaleTotal = Math.max(compareYMax, baseYMax);
        }




        // if (compareY !== baseY) {
        //     //           update = {};
        //     update.newYScale = Math.max(compareY, baseY)
        // }

        // if (compareYMax !== baseYMax) {
        //     //           update = {};
        //     update.newYScaleTotal = Math.max(compareYMax, baseYMax)
        // }

        //if there is a difference between compare and base item count extents, update rScale
        // if (this.compareItemCountExtentAbs[0] < this.baseItemCountExtentAbs[0] ||
        //     this.compareItemCountExtentAbs[1] > this.baseItemCountExtentAbs[1] ||
        //     this.compareItemCountExtentAvg[0] < this.baseItemCountExtentAvg[0] ||
        //     this.compareItemCountExtentAvg[1] > this.baseItemCountExtentAvg[1]) {

        //     if (!update) update = {};

        //     // update.newRScale = [
        //     //     Math.min(this.compareItemCountExtentAvg[0], this.baseItemCountExtentAvg[0], this.compareItemCountExtentAbs[0], this.baseItemCountExtentAbs[0]),
        //     //     Math.max(this.compareItemCountExtentAvg[1], this.baseItemCountExtentAvg[1], this.compareItemCountExtentAbs[1], this.baseItemCountExtentAbs[1])
        //     // ]
        // }

        if (update) {
            //console.log('update', update);
            this.drawTimeline(update);
        }

        /* if (update && update.newRScale) {
            this.rScale?.domain([update.newRScale[0], update.newRScale[1]])
        } else {
            this.rScale?.domain(rExt as Array<number>);
        } */



        /* const lineGenerator = d3.line<{ year: number, exhibitions: number, items: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, exhibitions: number, items: number }) => {
                return this.xScale ? this.xScale(d.year) : 0;
            })
            .y((d: { year: number, exhibitions: number, items: number }) => this.yScale ? this.yScale(d.exhibitions) : 0); */

        if (!this.baseTimelineContainer) return;

        const comparePaths = this.baseTimelineContainer.selectAll('.compare-base-path');

        const compareLineGenerator = d3.line<{ year: number, count: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, count: number }) => {
                return this.xScale ? this.xScale(d.year) : 0;
            })
            .y((d: { year: number, count: number }) => this.yScale ? this.yScale(d.count) : 0);


        const compareLineGeneratorTotal = d3.line<{ year: number, count: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, count: number }) => {
                return this.xScale ? this.xScale(d.year) : 0;
            })
            .y((d: { year: number, count: number }) => this.yScaleTotal ? this.yScaleTotal(d.count) : 0);


        /* console.log("comparescales");
        console.log(update.newYScale + " " + this.yScale?.domain()[1] + " " + update.newYScaleTotal + " " + this.yScaleTotal?.domain()[1]);
 */
        const comparePathsTotal = this.baseTimelineContainer.selectAll('.compare-total-path');

        comparePathsTotal
            .data(compareItemsTotalData)
            .join('path')
            .attr('d', compareLineGeneratorTotal.bind(this)(compareItemsTotalData))
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.05)
            .style('stroke-dasharray', ('3, 3'))
            .attr('fill', 'none');
        comparePathsTotal.lower();
        comparePathsTotal.exit().remove();


        comparePaths
            .data(compareItemsData)
            .join('path')
            .attr('d', compareLineGenerator.bind(this)(compareItemsData))
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('stroke', 'orange')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.05)
            .style('stroke-dasharray', ('3, 3'))
            .attr('fill', 'none');

        comparePaths.lower();
        comparePaths.exit().remove();

        // push rect to bottom
        this.svgTimeLineContainer.select('#timeline-background').lower();








        // from this.state.compareWith artist calculate total amount of exhibitions per year
        // iterate over exhibitions array and calculate total amount of exhibitions per year
        /* const exhibitionsPerYear = new Map<number, Set<string>>();
        const itemsPerYear = new Map<number, number>();

        this.state.compareWith?.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
            const year = +exhibition.startdate;
            if (exhibitionsPerYear.has(year)) {
                exhibitionsPerYear.get(year)?.add(exhibition.id);
            } else {
                exhibitionsPerYear.set(year, new Set<string>([exhibition.id]));
            }

            if (itemsPerYear.has(year)) {
                const count = itemsPerYear.get(year) || 0;
                itemsPerYear.set(year, count + 1);
            } else {
                itemsPerYear.set(year, 1);
            }
        }); */

        // convert exhibitions by year from number, Set<string> to number, number (count)
        /*  const exhibitionData = [...exhibitionsPerYear].map(([year, set]) => ({ year, count: set.size })).sort((a, b) => a.year - b.year);
 
         // convert items by year to array
         const itemsData = [...itemsPerYear].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);
 
         // merge arrays exhibitionData and itemsData 
         const data = exhibitionData.map((exhibition: { year: number, count: number }) => {
             const items = itemsData.find((item: { year: number, count: number }) => item.year === exhibition.year);
             if (items) {
                 return { year: exhibition.year, exhibitions: exhibition.count, items: items.count };
             } else {
                 return { year: exhibition.year, exhibitions: exhibition.count, items: 0 };
             }
         }); */

        /* const years: Array<number> = Array.from(Array(this.maxYear - this.minYear + 1).keys()).map((i) => i + this.minYear);

        const dataWithMissingYears: Array<{ year: number, exhibitions: number, items: number }> = years.map((year: number) => {
            const yearData = data.find((d: { year: number, exhibitions: number, items: number }) => {
                return d.year === year
            });
            if (yearData) {
                return yearData;
            } else {
                return { year, exhibitions: 0, items: 0 };
            }
        }); */

        // this.yearExtent = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.year);
        // this.exhibitionCountExtent = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.exhibitions);
        /* this.compareItemCountExtentAbs = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items) as [number, number];
        this.compareItemCountExtentAvg = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items / d.exhibitions) as [number, number];

 */

    }







    mouseOverCallBack(year: number) {
        if (this.props.mouseOverCallBack) this.props.mouseOverCallBack(year);
    }

    componentDidMount(): void {
        // get map-container element width and height and set state
        const width = document.getElementById('artistinfo-container')?.clientWidth;
        const height = document.getElementById('artistinfo-container')?.clientHeight;



        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
        // set resize handler to window
        window.addEventListener('resize', this.onResize);

        // this.init();
    }

    componentDidUpdate(prevProps: Readonly<{ compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width?: number, height?: number, mouseOverCallBack?: Function }>, prevState: Readonly<{ compareWith: Artist | null, exhibStatistics: Array<MetaExhibition>, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }>, snapshot?: any): void {

        //console.log("component did update");
        //console.log(prevProps.compareWith);
        //console.log(this.props.compareWith);
        // set state if props.compareWith changes and update results.exhibitions
        if (prevProps.compareWith !== this.props.compareWith) {
            this.setState((prevState: any) => {
                // update results.exhibitions
                /* const exhibitions = new Array<MetaExhibition>();
                prevState.results.exhibitions?.forEach((exhibition: MetaExhibition) => {
                    const metaExhibition: MetaExhibition = { ...exhibition, isCommon: false, percentBase: 0, percentCompare: 0 };
                    
                    const isCommon = this.props.compareWith?.exhibitedExhibitions?.find((exh: Exhibition) => exh.id === exhibition.id);
                    metaExhibition.isCommon = isCommon ? true : false;
                    metaExhibition.percentBase = exhibition.percentBase;
                    metaExhibition.percentCompare = this.getPercentage(metaExhibition, this.props.compareWith?.id);
                    
                    // const percentBase = this.state..artistsExhibited?.length / this.props.compareWith?.exhibitedExhibitions?.length;
                    exhibitions.push(metaExhibition);
                }); */
                // sort by isCommon
                /* exhibitions.sort((a: MetaExhibition, b: MetaExhibition) => {
                    if(a.isCommon && !b.isCommon) return -1;
                    if(!a.isCommon && b.isCommon) return 1;
                    return 0;
                });
    */

                /*             const commonExhibitions = new Array<MetaExhibition>();
                            //console.log("exhibStats");
                            //console.log(this.exhibStats);
                            this.exhibStats.forEach((exhibition: MetaExhibition) => {
            
                                const metaExhibition: MetaExhibition = { ...exhibition };
            
                                const isCommon = this.props.compareWith?.exhibitedExhibitions?.find((exh: Exhibition) => exh.id === exhibition.id);
                                metaExhibition.isCommon = isCommon ? true : false;
            
                                commonExhibitions.push(metaExhibition);
            
                            });
            
                            commonExhibitions.sort((a: MetaExhibition, b: MetaExhibition) => {
                                if (a.isCommon && !b.isCommon) return 1;
                                if (!a.isCommon && b.isCommon) return -1;
                                return 0;
                            }); */

                /* this.exhibStats.sort((a: MetaExhibition, b: MetaExhibition) => {
                    if (a.isCommon && !b.isCommon) return 1;
                    if (!a.isCommon && b.isCommon) return -1;
                    return 0;
                }); */
                //console.log(this.exhibStats);
                const artistId = this.props.compareWith?.id;

                client.query({
                    query: GET_EXHIBITIONS_BY_ARTIST,
                    variables: {
                        searchId: artistId
                    }
                }).then(result => {
                    this.setState(prevState => ({ compareWith: result.data.artists[0] }), () => {
                        this.drawCompare(result.data.artists[0]);
                    });

                });

                //this.colorCommonExhibitions();
                //this.init();
                return { ...prevState, compareWith: this.props.compareWith }
                //return { ...prevState, compareWith: this.props.compareWith, results: { ...prevState.results, exhibitions: exhibitions } } 

            });

        }
    }


    onResize = () => {
        // get map-container element width and height and set state
        const width = document.getElementById('artistinfo-container')?.clientWidth;
        const height = document.getElementById('artistinfo-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
    }

    /* zoomed($event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        if (!this.svgContainer) return;
        //this.svgContainer.select('#map-everything').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);

        //only scale map + markers, not the tooltips
        //console.log("x y " + $event.transform.x + " " + $event.transform.y);
        this.svgContainer.select('#map-borders').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);
        this.svgContainer.select('#map-markers').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);
        //this.svgContainer.select('#map-tooltip').selectAll('rect').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);

    } */


    //TODO return unique exhibitions, not 1 for each artwork
    checkExhibitions(exhibitions: Array<Exhibition> | undefined): Array<Exhibition> {

        if (exhibitions) {
            return exhibitions;
        }
        else return new Array<Exhibition>;
        //<div className="float-left text-left pl-2">
        //</div>
    }


    render() {
        return (
            <>
                <div className="absolute -z-10">
                    <svg id='artist-detail-timeline' width={this.state.width} height={this.state.height}></svg>
                </div>

            </>
        )
    }
};

export default ExhibitionLinechartComponent;