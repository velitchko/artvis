import React from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import client from '../apollo/client';
import SearchComponent from '../search/search';
import GET_ARTIST_BY_NAME from '../../queries/artistByName';
import GET_ARTIST from '../../queries/artist';
import EgoNetworkComponent from '../network/ego.network';
import TableComponent from '../table/table';
import _ from 'lodash';
import GET_EXHIBITION from '../../queries/exhibition';
// TODO: Move line chart to separate component
class ArtistDetailComponent extends React.Component<{ artist: Artist }, { artist: Artist, compareWith: Artist | null, baseNode: Node, links: Array<Link>, width: number, height: number }> {

    private svgTimeLineContainer: d3.Selection<any, any, any, any> | undefined;
    private baseTimelineContainer: d3.Selection<any, any, any, any> | undefined;
    private compareTimelineContainer: d3.Selection<any, any, any, any> | undefined;

    private xAxis: d3.Selection<any, any, any, any> | undefined;
    private yAxis: d3.Selection<any, any, any, any> | undefined;
    private tooltip: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
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
    private links: Array<Link>;
    private showNetwork: boolean = false;
    private loadingExternalData: boolean = false;
    private egoNetwork = React.createRef<EgoNetworkComponent>();

    constructor(props: { artist: Artist, compareWith: Artist | null, baseNode: Node, links: Array<Link> }) {
        super(props);

        this.state = {
            artist: props.artist,
            width: 0,
            height: 0,
            compareWith: null,
            baseNode: {} as Node,
            links: new Array<Link>(),
        };

        this.svgTimeLineContainer = undefined;
        this.tooltip = undefined;

        this.links = new Array<Link>();

        this.xScale = undefined;
        this.yScale = undefined;

        this.baseItemCountExtentAbs = [0, 0];
        this.baseItemCountExtentAvg = [0, 0];
        this.compareItemCountExtentAbs = [0, 0];
        this.compareItemCountExtentAvg = [0, 0];

        this.width = 500;
        this.height = 200;

        this.minYear = 1905;
        this.maxYear = 1915;

        this.margin = {
            top: 30,
            bottom: 30,
            left: 30,
            right: 30
        };
    }

    onClick = (event: any) => {
        this.onArtistChange(event);
    }

    componentDidMount(): void {
        // this.width = window.innerWidth * 0.6;

        // get ego-net-container element width and height and set state
        const width = document.getElementById('timeline-container')?.clientWidth;
        const height = document.getElementById('timeline-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });

        // set resize handler to window
        window.addEventListener('resize', this.onResize);

        // this.init();
    }

    onResize = () => {
        // get ego-net-container element width and height and set state
        const width = document.getElementById('timeline-container')?.clientWidth;
        const height = document.getElementById('timeline-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
    }

    init() {
        const timeline = this.svgTimeLineContainer?.select('.timeline-container');

        if (timeline) return;

        this.svgTimeLineContainer = d3.select('#artist-detail-timeline')
            .attr('width', this.state.width)
            .attr('height', this.state.height)
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('overflow', 'visible');

        this.svgTimeLineContainer.append('g')
            .attr('class', 'timeline-container')
            .append('rect')
            .attr('id', 'timeline-background')
            .attr('fill', 'transparent');

        this.baseTimelineContainer = this.svgTimeLineContainer.select('.timeline-container').append('g').attr('id', 'base-timeline');
        this.compareTimelineContainer = this.svgTimeLineContainer.select('.timeline-container').append('g').attr('id', 'compare-timeline');


        this.xScale = d3.scaleLinear<number, number, never>().range([this.margin.left * 2, this.state.width - (this.margin.right / 2)]);
        this.yScale = d3.scaleLinear<number, number, never>().range([this.state.height - this.margin.top, this.margin.top]);
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

        this.svgTimeLineContainer.append('text')
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
            .text('Exhibitions');

        // add title
        this.svgTimeLineContainer.append('text')
            .attr('class', 'title')
            .attr('x', this.state.width / 2)
            .attr('y', -this.margin.top)
            .attr('text-anchor', 'middle')
            .text('Exhibitions over time');

        this.drawTimeline();
        this.drawNetwork();
    }

    drawTimeline(update?: { newYScale?: number, newRScale?: Array<number> }) {
        if (!this.svgTimeLineContainer) return;

        if (!this.state.artist.exhibitedExhibitions) return;

        // draw timeline of artists and their exhibitions over time
        // iterate over exhibitions array and calculate total amount of exhibitions per year
        const exhibitionsPerYear = new Map<number, Set<string>>();
        const itemsPerYear = new Map<number, number>();
        this.state.artist.exhibitedExhibitions.forEach((exhibition: Exhibition) => {
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
        });

        // convert exhibitions by year from number, Set<string> to number, number (count)
        const exhibitionData = [...exhibitionsPerYear].map(([year, set]) => ({ year, count: set.size })).sort((a, b) => a.year - b.year);

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
        });

        this.baseItemCountExtentAbs = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items) as [number, number];
        this.baseItemCountExtentAvg = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items / d.exhibitions) as [number, number];

        if (!data.length) return;

        this.xScale?.domain([this.minYear, this.maxYear]);

        const years: Array<number> = Array.from(Array(this.maxYear - this.minYear + 1).keys()).map((i) => i + this.minYear);

        const dataWithMissingYears: Array<{ year: number, exhibitions: number, items: number }> = years.map((year: number) => {
            const yearData = data.find((d: { year: number, exhibitions: number, items: number }) => {
                return d.year === year
            });
            if (yearData) {
                return yearData;
            } else {
                return { year, exhibitions: 0, items: 0 };
            }
        });

        const yExt = d3.extent(dataWithMissingYears, (d: { year: number, exhibitions: number, items: number }) => d.exhibitions);

        // // this.yScale?.domain(this.state.countExtent as Array<number>);
        update && update.newYScale ? this.yScale?.domain([0, update.newYScale]) : this.yScale?.domain([0, yExt[1] as number]);

        const rExt = [Math.min(this.baseItemCountExtentAbs[0], this.baseItemCountExtentAvg[0]), Math.max(this.baseItemCountExtentAbs[1], this.baseItemCountExtentAvg[1])];

        if (update && update.newRScale) {
            this.rScale?.domain([update.newRScale[0], update.newRScale[1]])
        } else {
            this.rScale?.domain(rExt as Array<number>);
        }

        const lineGenerator = d3.line<{ year: number, exhibitions: number, items: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, exhibitions: number, items: number }) => {
                return this.xScale ? this.xScale(d.year) : 0;
            })
            .y((d: { year: number, exhibitions: number, items: number }) => this.yScale ? this.yScale(d.exhibitions) : 0);

        if (!this.baseTimelineContainer) return;

        const paths = this.baseTimelineContainer.selectAll('.base-path');

        paths
            .data(dataWithMissingYears)
            .join('path')
            .attr('d', lineGenerator.bind(this)(dataWithMissingYears))
            .attr('class', 'base-path')
            .attr('id', 'base-path')
            .attr('stroke', 'gray')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.75)
            .attr('fill', 'none');

        paths.exit().remove();

        // add axis
        const xAxis = d3.axisBottom(this.xScale as d3.AxisScale<number>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        // format ticks
        xAxis.tickFormat(d3.format('d'));
        yAxis.tickFormat(d3.format('d')).ticks(this.yScale?.domain()[1] as number);

        this.xAxis?.call(xAxis);
        this.yAxis?.call(yAxis);

        const absHalfCircles = this.baseTimelineContainer?.selectAll('.base-abs-half-circle');

        absHalfCircles
            .data(dataWithMissingYears)
            .join('path')
            .attr('fill', 'gray')
            .attr('fill-opacity', 1)
            .attr('stroke', 'white')
            .attr('stroke-opacity', 0.75)
            .attr('stroke-width', 1)
            .attr('class', 'base-abs-half-circle')
            .attr('id', (d: { year: number, exhibitions: number, items: number }) => `abs-base-circle-${d.year}`)
            .attr('d', (d: { year: number, exhibitions: number, items: number }) => {
                const outerRadius = d.items === 0 ? 3 : this.rScale ? this.rScale(d.items) : 3;
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: -Math.PI,
                    endAngle: 0
                }) as string;
            })
            .on('mouseover', (event: any, d: { year: number, exhibitions: number, items: number }) => {
                if (this.tooltip) {
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const xPos = this.xScale ? this.xScale(d.year) : 0;
                    const yPos = this.yScale ? this.yScale(d.exhibitions) : 0;

                    tooltip
                        .attr('fill', 'black')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${this.state.artist.firstname} ${this.state.artist.lastname} (${d.year})`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 30)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.exhibitions} exhibitions`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 45)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.items} artworks`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 60)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`average ${(d.items / d.exhibitions).toFixed(2)} artworks per exhibition`);

                    // get bbox of text
                    const bbox = text.node()?.getBBox();

                    if (bbox) {
                        // set tooltip width and height to bbox width and height
                        tooltip.attr('width', bbox.width + 20);
                        tooltip.attr('height', bbox.height + 5);
                    }

                    this.tooltip.raise();
                }

                this.showTimeCallBack(d.year);
                this.highlightCircleInNetwork(d.year);
            })
            .attr('transform', (d: { year: number, exhibitions: number, items: number }) => {
                return `translate(${this.xScale ? this.xScale(d.year) : 0}, ${this.yScale ? this.yScale(d.exhibitions) : 0})`;
            })
            .on('mouseout', () => {
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();
                // lower tooltip 
                this.tooltip?.lower();

                this.showTimeCallBack(0);
                this.highlightCircleInNetwork(0);
            });

        const avgHalfCircles = this.baseTimelineContainer?.selectAll('.base-avg-half-circle');

        avgHalfCircles
            .data(dataWithMissingYears)
            .join('path')
            .attr('fill', 'white')
            .attr('fill-opacity', 1)
            .attr('stroke', 'gray')
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 2)
            .attr('class', 'base-avg-half-circle')
            .attr('id', (d: { year: number, exhibitions: number, items: number }) => `avg-base-circle-${d.year}`)
            .attr('d', (d: { year: number, exhibitions: number, items: number }) => {
                const outerRadius = isNaN(d.items / d.exhibitions) ? 3 : this.rScale ? this.rScale(d.items / d.exhibitions) : 3;
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: Math.PI,
                    endAngle: 0
                }) as string;
            })
            .on('mouseover', (event: any, d: { year: number, exhibitions: number, items: number }) => {
                if (this.tooltip) {
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const xPos = this.xScale ? this.xScale(d.year) : 0;
                    const yPos = this.yScale ? this.yScale(d.exhibitions) : 0;

                    tooltip
                        .attr('fill', 'black')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${this.state.artist.firstname} ${this.state.artist.lastname} (${d.year})`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 30)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.exhibitions} exhibitions`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 45)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.items} artworks`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 60)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`average ${(d.items / d.exhibitions).toFixed(2)} artworks per exhibition`);

                    // get bbox of text
                    const bbox = text.node()?.getBBox();

                    if (bbox) {
                        // set tooltip width and height to bbox width and height
                        tooltip.attr('width', bbox.width + 20);
                        tooltip.attr('height', bbox.height + 5);
                    }

                    this.tooltip.raise();
                }
                this.showTimeCallBack(d.year);
                this.highlightCircleInNetwork(d.year);
            })
            .attr('transform', (d: { year: number, exhibitions: number, items: number }) => {
                return `translate(${this.xScale ? this.xScale(d.year) : 0}, ${this.yScale ? this.yScale(d.exhibitions) : 0})`;
            })
            .on('mouseout', () => {
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();
                // lower tooltip 
                this.tooltip?.lower();

                this.showTimeCallBack(0);
                this.highlightCircleInNetwork(0);
            });

        absHalfCircles.exit().remove();
        avgHalfCircles.exit().remove();
    }

    drawNetwork() {
        const source: Node = {
            id: this.state.artist.id,
            name: this.state.artist.firstname + ' ' + this.state.artist.lastname,
            type: 'artist',
            props: { data: this.state.artist }
        };

        // string == exhib.id, 
        let coexhibMap: Map<string, Set<{ year: number, exhibitionIds: Set<string> }>> = new Map<string, Set<{ year: number, exhibitionIds: Set<string> }>>();
        this.state.artist.exhibitedWithArtists?.forEach((artist: Artist) => {
            artist.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
                // check if source artist also exhibited in this exhibition
                const sourceExhibition = this.state.artist.exhibitedExhibitions?.find((ex: Exhibition) => ex.id === exhibition.id);

                if (!sourceExhibition) return;

                const year = +exhibition.startdate;
                const key = `${artist.id}`;

                if (coexhibMap.has(key)) {
                    const value = coexhibMap.get(key) as Set<{ year: number, exhibitionIds: Set<string> }>;
                    const yearData = Array.from(value).find((d: { year: number, exhibitionIds: Set<string> }) => d.year === year);

                    if (yearData) {
                        yearData.exhibitionIds.add(exhibition.id);
                    } else {
                        value.add({ year, exhibitionIds: new Set<string>([exhibition.id]) });
                    }
                } else {
                    coexhibMap.set(key, new Set<{ year: number, exhibitionIds: Set<string> }>([{ year, exhibitionIds: new Set<string>([exhibition.id]) }]));
                }
            });
        });

        coexhibMap.forEach((value: Set<{ year: number, exhibitionIds: Set<string> }>, key: string) => {
            const found: Artist | undefined = this.state.artist.exhibitedWithArtists?.find((artist: Artist) => `${artist.id}` === key);

            if (!found) {
                console.log(key + ' not found');
                return;
            }

            const target: Node = {
                id: key,
                name: found.firstname + ' ' + found.lastname,
                type: 'artist',
                props: { data: found }
            };

            // iterate over value set
            value.forEach((item: { year: number, exhibitionIds: Set<string> }) => {
                const link: Link = {
                    sourceId: `${source.id}`,
                    targetId: `${target.id}`,
                    props: {
                        data: {
                            year: item.year,
                            count: item.exhibitionIds.size
                        }
                    },
                    source: source,
                    target: target
                };

                this.links.push(link);
            });
        });

        this.setState(prevState => ({ baseNode: source, links: this.links }), this.readyToDrawNetwork);
    }

    readyToDrawNetwork() {
        this.showNetwork = true;
        this.forceUpdate();
    }

    drawCompare() {
        // draw bars on each year to compare with other artist
        if (!this.svgTimeLineContainer) return;

        if (!this.state.artist.exhibitedExhibitions) return;

        if (!this.state.compareWith) return;

        // const timeline = this.svgTimeLineContainer.select('.timeline-container').append('g').attr('id', 'compare-timeline');

        // from this.state.compareWith artist calculate total amount of exhibitions per year
        // iterate over exhibitions array and calculate total amount of exhibitions per year
        const exhibitionsPerYear = new Map<number, Set<string>>();
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
        });

        // convert exhibitions by year from number, Set<string> to number, number (count)
        const exhibitionData = [...exhibitionsPerYear].map(([year, set]) => ({ year, count: set.size })).sort((a, b) => a.year - b.year);

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
        });

        const years: Array<number> = Array.from(Array(this.maxYear - this.minYear + 1).keys()).map((i) => i + this.minYear);

        const dataWithMissingYears: Array<{ year: number, exhibitions: number, items: number }> = years.map((year: number) => {
            const yearData = data.find((d: { year: number, exhibitions: number, items: number }) => {
                return d.year === year
            });
            if (yearData) {
                return yearData;
            } else {
                return { year, exhibitions: 0, items: 0 };
            }
        });

        // this.yearExtent = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.year);
        // this.exhibitionCountExtent = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.exhibitions);
        this.compareItemCountExtentAbs = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items) as [number, number];
        this.compareItemCountExtentAvg = d3.extent(data, (d: { year: number, exhibitions: number, items: number }) => d.items / d.exhibitions) as [number, number];


        // check if count is higher than base artist and draw line
        const compareYMax = d3.max(dataWithMissingYears, (d: { year: number, exhibitions: number, items: number }) => d.exhibitions) as number;
        const baseYMax = this.yScale?.domain()[1] as number;

        let update: { newYScale?: number, newRScale?: Array<number> } | undefined = undefined;

        if (compareYMax !== baseYMax) {
            update = {};
            update.newYScale = Math.max(compareYMax, baseYMax)
        }

        // if there is a difference between compare and base item count extents, update rScale
        if (this.compareItemCountExtentAbs[0] < this.baseItemCountExtentAbs[0] ||
            this.compareItemCountExtentAbs[1] > this.baseItemCountExtentAbs[1] ||
            this.compareItemCountExtentAvg[0] < this.baseItemCountExtentAvg[0] ||
            this.compareItemCountExtentAvg[1] > this.baseItemCountExtentAvg[1]) {

            if (!update) update = {};

            update.newRScale = [
                Math.min(this.compareItemCountExtentAvg[0], this.baseItemCountExtentAvg[0], this.compareItemCountExtentAbs[0], this.baseItemCountExtentAbs[0]),
                Math.max(this.compareItemCountExtentAvg[1], this.baseItemCountExtentAvg[1], this.compareItemCountExtentAbs[1], this.baseItemCountExtentAbs[1])
            ]
        }

        if (update) {
            console.log('update', update);
            this.drawTimeline(update);
        }

        const lineGenerator = d3.line<{ year: number, exhibitions: number, items: number }>()
            .curve(d3.curveMonotoneX)
            .x((d: { year: number, exhibitions: number, items: number }) => this.xScale ? this.xScale(d.year) : 0)
            .y((d: { year: number, exhibitions: number, items: number }) => this.yScale ? this.yScale(d.exhibitions) : 0);

        if (!this.compareTimelineContainer) return;

        const commonExhibitions = this.state.compareWith.exhibitedExhibitions?.filter((exhibition: Exhibition) => {
            return this.state.artist.exhibitedExhibitions?.find((e: Exhibition) => e.id === exhibition.id);
        });

        const uniqueCommonExhibitions = Array.from(new Set(commonExhibitions));

        const commonExhibitionsPerYear = new Map<number, number>();

        uniqueCommonExhibitions?.forEach((exhibition: Exhibition) => {
            const year = +exhibition.startdate;
            if (commonExhibitionsPerYear.has(year)) {
                const count = commonExhibitionsPerYear.get(year) || 0;
                commonExhibitionsPerYear.set(year, count + 1);
            } else {
                commonExhibitionsPerYear.set(year, 1);
            }
        });

        // convert exhibitions by year to array
        const commonExhibitionsData = [...commonExhibitionsPerYear].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        // fill in missing years in data with 0s
        const commonExhibitionsDataWithMissingYears = years.map((year: number) => {
            const yearData = commonExhibitionsData.find((d: { year: number, count: number }) => {
                return d.year === year
            });
            if (yearData) {
                return yearData;
            } else {
                return { year, count: 0 };
            }
        });

        // draw rectangles for common exhibitions on timeline
        const rects = this.compareTimelineContainer.selectAll('.common-exhibition');

        rects
            .data(commonExhibitionsDataWithMissingYears)
            .join('rect')
            .attr('class', 'common-exhibition')
            .attr('x', (d: { year: number, count: number }) => this.xScale ? this.xScale(d.year) - 25 : 0)
            .attr('y', (d: { year: number, count: number }) => this.yScale ? this.yScale(d.count) : 0)
            .attr('width', (d: { year: number, count: number }) => {
                return 50;
                // return x - (this.xScale ? this.xScale(d.year) : 0);
            })
            .attr('fill', '#FEF3C7')
            .attr('stroke', 'gray')
            // .attr('opacity', 0.5)
            .on('mouseover', (event: any, d: { year: number, count: number }) => {
                if (this.tooltip) {
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const xPos = this.xScale ? this.xScale(d.year) : 0;
                    const yPos = this.yScale ? this.yScale(d.count) : 0;

                    tooltip
                        .attr('fill', 'black')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`Year: ${d.year}`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 30)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.count} co-exhibitions`);

                    // get bbox of text
                    const bbox = text.node()?.getBBox();

                    if (bbox) {
                        // set tooltip width and height to bbox width and height
                        tooltip.attr('width', bbox.width + 20);
                        tooltip.attr('height', bbox.height + 5);
                    }

                    this.tooltip.raise();
                }
            })
            .on('mouseout', () => {
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();
                // lower tooltip 
                this.tooltip?.lower();
            })
            .transition()
            .duration(250)
            .attr('height', (d: { year: number, count: number }) => {
                return this.yScale ? this.yScale(0) - this.yScale(d.count) : 0;
                // return y - (this.yScale ? this.yScale(d.count) : 0);
            });

        rects.exit().remove();

        const absHalfCircles = this.compareTimelineContainer?.selectAll('.compare-abs-half-circle');

        absHalfCircles
            .data(dataWithMissingYears)
            .join('path')
            .attr('fill', 'gray')
            .attr('fill-opacity', 1)
            .attr('stroke', 'white')
            .attr('stroke-opacity', 0.75)
            .attr('stroke-width', 1)
            .attr('class', 'compare-abs-half-circle')
            .attr('id', (d: { year: number, exhibitions: number, items: number }) => `abs-compare-circle-${d.year}`)
            .attr('d', (d: { year: number, exhibitions: number, items: number }) => {
                const outerRadius = d.items === 0 ? 3 : this.rScale ? this.rScale(d.items) : 3;
                console.log('outerRadius', outerRadius);
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: -Math.PI,
                    endAngle: 0
                }) as string;
            })
            .on('mouseover', (event: any, d: { year: number, exhibitions: number, items: number }) => {
                if (this.tooltip) {
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const xPos = this.xScale ? this.xScale(d.year) : 0;
                    const yPos = this.yScale ? this.yScale(d.exhibitions) : 0;

                    tooltip
                        .attr('fill', 'black')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${this.state.artist.firstname} ${this.state.artist.lastname} (${d.year})`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 30)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.exhibitions} exhibitions`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 45)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.items} artworks`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 60)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`average ${(d.items / d.exhibitions).toFixed(2)} artworks per exhibition`);

                    // get bbox of text
                    const bbox = text.node()?.getBBox();

                    if (bbox) {
                        // set tooltip width and height to bbox width and height
                        tooltip.attr('width', bbox.width + 20);
                        tooltip.attr('height', bbox.height + 5);
                    }

                    this.tooltip.raise();

                }
                this.showTimeCallBack(d.year);
                this.highlightCircleInNetwork(d.year);
            })
            .attr('transform', (d: { year: number, exhibitions: number, items: number }) => {
                return `translate(${this.xScale ? this.xScale(d.year) : 0}, ${this.yScale ? this.yScale(d.exhibitions) : 0})`;
            })
            .on('mouseout', () => {
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();
                // lower tooltip 
                this.tooltip?.lower();

                this.showTimeCallBack(0);
                this.highlightCircleInNetwork(0);
            });

        const avgHalfCircles = this.compareTimelineContainer?.selectAll('.compare-avg-half-circle');

        avgHalfCircles
            .data(dataWithMissingYears)
            .join('path')
            .attr('fill', 'white')
            .attr('fill-opacity', 1)
            .attr('stroke', 'gray')
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 2)
            .attr('class', 'compare-avg-half-circle')
            .attr('id', (d: { year: number, exhibitions: number, items: number }) => `avg-compare-circle-${d.year}`)
            .attr('d', (d: { year: number, exhibitions: number, items: number }) => {
                const outerRadius = isNaN(d.items / d.exhibitions) ? 3 : this.rScale ? this.rScale(d.items / d.exhibitions) : 3;
                return d3.arc()({
                    innerRadius: 0,
                    outerRadius: outerRadius,
                    startAngle: Math.PI,
                    endAngle: 0
                }) as string;
            })
            .on('mouseover', (event: any, d: { year: number, exhibitions: number, items: number }) => {
                if (this.tooltip) {
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const xPos = this.xScale ? this.xScale(d.year) : 0;
                    const yPos = this.yScale ? this.yScale(d.exhibitions) : 0;

                    tooltip
                        .attr('fill', 'black')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${this.state.compareWith?.firstname} ${this.state.compareWith?.lastname} (${d.year})`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 30)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.exhibitions} exhibitions`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 45)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${d.items} artworks`);

                    text.append('tspan')
                        .attr('x', xPos + 15)
                        .attr('y', yPos + 60)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`average ${(d.items / d.exhibitions).toFixed(2)} artworks per exhibition`);

                    // get bbox of text
                    const bbox = text.node()?.getBBox();

                    if (bbox) {
                        // set tooltip width and height to bbox width and height
                        tooltip.attr('width', bbox.width + 20);
                        tooltip.attr('height', bbox.height + 5);
                    }

                    this.tooltip.raise();
                }
                this.showTimeCallBack(d.year);
                this.highlightCircleInNetwork(d.year);
            })
            .attr('transform', (d: { year: number, exhibitions: number, items: number }) => {
                return `translate(${this.xScale ? this.xScale(d.year) : 0}, ${this.yScale ? this.yScale(d.exhibitions) : 0})`;
            })
            .on('mouseout', () => {
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();
                // lower tooltip 
                this.tooltip?.lower();

                this.showTimeCallBack(0);
                this.highlightCircleInNetwork(0);
            });

        absHalfCircles.exit().remove();
        avgHalfCircles.exit().remove();

        const paths = this.compareTimelineContainer.selectAll('.compare-path');

        paths
            .data(dataWithMissingYears)
            .join('path')
            .attr('d', lineGenerator.bind(this)(dataWithMissingYears))
            .attr('stroke', 'gray')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.75)
            .style('stroke-dasharray', ('3, 3'))
            .attr('fill', 'none')
            .attr('class', 'compare-path')
            .attr('id', 'compare-path')

        paths.lower();
        paths.exit().remove();

        // push rect to bottom
        this.svgTimeLineContainer.select('#timeline-background').lower();
    }

    onArtistChange(artistId: string) {
        this.setState({ compareWith: null });

        const artist = this.state.artist.exhibitedWithArtists?.find((artist: Artist) => artist.id === artistId);

        if (artist) {
            // this.setState({ compareWith: artist });
            this.setState(prevState => ({ compareWith: artist }), () => {
                this.drawCompare();
                this.egoNetwork.current?.highlightArtist(this.state.compareWith);
            });
            // this.drawCompare();
        } else {
            console.log('artist not found');
            this.loadingExternalData = true;
            // query artist by id
            client.query({
                query: GET_ARTIST,
                variables: {
                    searchId: artistId
                }
            }).then(result => {
                this.setState(prevState => ({ compareWith: result.data.artists[0] }), () => {
                    this.drawCompare();
                    this.egoNetwork.current?.highlightArtist(this.state.compareWith);
                });
                this.loadingExternalData = false;
            });

        }
    }

    formatDate(date: Date | string | undefined) {
        if (!date) return '';

        const dateObj = new Date(date);
        return `${dateObj.getFullYear()}`; // -${dateObj.getMonth()}-${dateObj.getDay()
    }

    showTimeCallBack(year: number) {
        if (!this.svgTimeLineContainer) return;

        if (year === 0) {
            // remove vertical line
            this.svgTimeLineContainer
                .select('#timeline-vertical-line')
                .remove();
        } else {
            // draw vertical line on timeline with x = year and y = 0, height = max y
            this.svgTimeLineContainer
                .append('line')
                .attr('id', 'timeline-vertical-line')
                .attr('x1', this.xScale ? this.xScale(year) : 0)
                .attr('y1', 0)
                .attr('x2', this.xScale ? this.xScale(year) : 0)
                .attr('y2', this.state.height - this.margin.bottom)
                .attr('stroke', 'orange')
                .attr('stroke-width', 3)
                .attr('stroke-opacity', 0.75)
                .attr('stroke-dasharray', ('3, 3'))
                .attr('fill', 'none');
        }
    }

    getUniqueExhibitions(exhibitions?: Array<Exhibition>): number {
        if (!exhibitions) return 0;

        const uniqueExhibitions = Array.from(new Set(exhibitions));

        return uniqueExhibitions.length;
    }

    nodeClickedCallback(id: string) {
        this.onArtistChange(id);
    }

    highlightCircleInNetwork(year: number) {
        this.egoNetwork.current?.highlightCircle(year);
    }

    render() {
        return (
            <>
                <div className="fixed w-[94%] h-auto z-50">
                    <div className="w-10/12 h-auto flex-col justify-center mx-auto">
                        <SearchComponent query={GET_ARTIST_BY_NAME} onClick={this.onClick}></SearchComponent>
                    </div>
                </div>
                {this.state.artist &&
                <div className="grid grid-flow-row-dense lg:grid-cols-5 lg:grid-rows-4 gap-1 sm:grid-cols-1 md:grid-rows-3 pt-20 w-full h-[95vh]">
                    <div className="row-span-1 col-span-2 z-40">
                        <div className="w-full h-[80%]" id="timeline-container">
                            <div className="float-left text-left pl-2">
                                <h1 className="lg:text-xl sm:text-md font-semibold border-b-2 border-gray-500 border-solid">{this.state.artist.firstname} {this.state.artist.lastname} ({this.state.artist.country})</h1>
                                <h2 className="lg:text-md sm:text-sm font-medium">{this.formatDate(this.state.artist.birthdate)} ({this.state.artist.birthplace}) - {this.formatDate(this.state.artist.deathdate)} ({this.state.artist.deathplace})</h2>
                                <h3 className="lg:text-sm sm:text-xs font-normal text-gray">{this.getUniqueExhibitions(this.state.artist.exhibitedExhibitions)} exhibitions | {this.state.artist.exhibitedExhibitions?.length} artworks</h3>
                            </div>
                            {this.state.compareWith &&
                                <div className="float-right text-right pr-2">
                                    <h1 className="lg:text-xl sm:text-md font-semibold border-b-2 border-gray-500 border-dashed">{this.state.compareWith.firstname} {this.state.compareWith.lastname} ({this.state.compareWith.country})</h1>
                                    <h2 className="lg:text-md sm:text-sm font-medium">{this.formatDate(this.state.compareWith.birthdate)} ({this.state.compareWith.birthplace}) - {this.formatDate(this.state.compareWith.deathdate)} ({this.state.compareWith.deathplace})</h2>
                                    <h3 className="lg:text-sm sm:text-xs font-normal text-gray">{this.getUniqueExhibitions(this.state.compareWith.exhibitedExhibitions)} exhibitions | {this.state.compareWith.exhibitedExhibitions?.length} artworks</h3>
                                </div>
                            }
                            <svg id="artist-detail-timeline"></svg>
                        </div>
                    </div>
                    <div className="lg:row-span-4 md:row-span-1 lg:col-span-3 sm:col-span-1 z-40">
                        <div className="w-full h-[90vh] sm:h-full" id="ego-net-container">
                            {this.showNetwork &&
                                <EgoNetworkComponent ref={this.egoNetwork} baseNode={this.state.baseNode} links={this.state.links} requestNode={this.onArtistChange.bind(this)} mouseOverCallBack={this.showTimeCallBack.bind(this)} />
                            }
                        </div>
                    </div>
                    <div className="lg:row-span-3 md:row-span-1 col-span-2 z-30">
                        <div className="w-full h-full overflow-y-scroll" id="table-container">
                            <TableComponent query={GET_EXHIBITION} baseId={this.state.artist.id} compareWith={this.state.compareWith} exhibitions={this.state.artist.exhibitedExhibitions} />
                        </div>
                    </div>
                </div>
                }
            </>
        );
    }
};

export default ArtistDetailComponent;