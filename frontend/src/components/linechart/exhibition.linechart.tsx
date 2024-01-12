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
            top: 30,
            bottom: 30,
            left: 30,
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
            .attr('transform', `translate(0, ${this.state.height - this.margin.bottom})`)
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


    drawTimeline(update?: { newYScale?: number, newRScale?: Array<number> }) {
        if (!this.svgTimeLineContainer) return;

        if (!this.exhibStats) return;

        // draw timeline of artists and their exhibitions over time
        // iterate over exhibitions array and calculate total amount of exhibitions per year
        //const exhibitionsPerYear = new Map<number, Set<string>>();
        //const itemsPerYear = new Map<number, number>();
        /*  this.exhibStats.forEach((exhibition: MetaExhibition) => {
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

        const itemsPerYearCumulated = new Map<number, number>();
        const itemsPerYearTotalCumulated = new Map<number, number>();

        //sort exhibitions by year
        this.exhibStats.sort((a, b) => { return a.startdate - b.startdate });
        //console.log("sorted stats linechart");
        //console.log(this.exhibStats);


        let highestBaseCount = 0;
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

        });

        highestBaseCount = 0;
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
        console.log(itemsPerYearTotalCumulated);


        // convert exhibitions by year from number, Set<string> to number, number (count)
        //const exhibitionData = [...exhibitionsPerYear].map(([year, set]) => ({ year, count: set.size })).sort((a, b) => a.year - b.year);

        const itemsData = [...itemsPerYearCumulated].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        const itemsTotalData = [...itemsPerYearTotalCumulated].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);
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
        update && update.newYScale ? this.yScaleTotal?.domain([0, update.newYScale]) : this.yScaleTotal?.domain([0, yExtTotal[1] as number]);

        const rExt = [Math.min(this.baseItemCountExtentAbs[0], this.baseItemCountExtentAvg[0]), Math.max(this.baseItemCountExtentAbs[1], this.baseItemCountExtentAvg[1])];

        if (update && update.newRScale) {
            this.rScale?.domain([update.newRScale[0], update.newRScale[1]])
        } else {
            this.rScale?.domain(rExt as Array<number>);
        }



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

        paths
            .data(itemsData)
            .join('path')
            .attr('d', lineGenerator.bind(this)(itemsData))
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('stroke', '#1f77b4')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0.75)
            .attr('fill', 'none');
        paths.exit().remove();

        const pathsTotal = this.baseTimelineContainer.selectAll('.total-path');

        pathsTotal
            .data(itemsTotalData)
            .join('path')
            .attr('d', lineGeneratorTotal.bind(this)(itemsTotalData))
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('stroke', 'lightgray')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.75)
            .attr('fill', 'none');
        paths.exit().remove();




        /* // add axis
        const xAxis = d3.axisBottom(this.xScale as d3.AxisScale<number>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        // format ticks
        xAxis.tickFormat(d3.format('d'));
        yAxis.tickFormat(d3.format('d')).ticks(this.yScale?.domain()[1] as number);

        this.xAxis?.call(xAxis);
        this.yAxis?.call(yAxis); */
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
    }


    render() {
        return (
            <>
                <div className="float-left text-left pl-2">
                </div>
                <svg id='artist-detail-timeline' width={this.state.width} height={this.state.height}></svg>
            </>
        )
    }
};

export default ExhibitionLinechartComponent;