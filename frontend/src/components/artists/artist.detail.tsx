import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';

class ArtistDetailComponent extends React.Component<{ artist: Artist }, { artist: Artist, compareWith: Artist | null }> {

    private svgTimeLineContainer: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };
    private yearExtent: Array<number> | Array<undefined>;
    private countExtent: Array<number> | Array<undefined>;
    private width: number = 500;
    private height: number = 500;
    private svgNetworkContainer: d3.Selection<any, any, any, any> | undefined;
    private simulation: d3.Simulation<d3.SimulationNodeDatum, undefined> | undefined;

    constructor(props: { artist: Artist, compareWith: Artist | null }) {
        super(props);

        this.state = {
            artist: props.artist,
            compareWith: null
        };

        this.svgTimeLineContainer = undefined;
        this.svgNetworkContainer = undefined;

        this.xScale = undefined;
        this.yScale = undefined;

        this.yearExtent = [];
        this.countExtent = [];

        this.width = 500;
        this.height = 500;

        this.margin = {
            top: 30,
            bottom: 30,
            left: 30,
            right: 30
        };
    }

    componentDidMount(): void {
        this.width = window.innerWidth;

        this.init();
    }

    init() {
        const timeline = this.svgTimeLineContainer?.select('.timeline-container');

        if(timeline) return;

        this.svgTimeLineContainer = d3.select('#artist-detail-timeline')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)

        this.svgTimeLineContainer.append('g')
            .attr('class', 'timeline-container')
            .append('rect')
            .attr('width', this.width - (this.margin.left + this.margin.right))
            .attr('height', this.height - (this.margin.top + this.margin.bottom))
            .attr('fill', 'transparent')

        this.xScale = d3.scaleLinear<number, number, never>().range([this.margin.left, this.width - this.margin.right]);
        this.yScale = d3.scaleLinear<number, number, never>().range([this.height - this.margin.top, this.margin.top]);
        
        this.drawTimeline();

        // const network = this.svgNetworkContainer?.select('.network-container');

        // if(network) return;

        // this.svgNetworkContainer = d3.select('#artist-detail-network')
        //     .attr('width', this.width)
        //     .attr('height', this.height)
        //     .attr('viewBox', `0 0 ${this.width} ${this.height}`)

        // this.svgNetworkContainer.append('g')
        //     .attr('class', 'network-container')
        //     .append('rect')
        //     .attr('width', this.width - (this.margin.left + this.margin.right))
        //     .attr('height', this.height - (this.margin.top + this.margin.bottom))
        //     .attr('fill', 'transparent')

        // this.drawNetwork();
    }

    drawTimeline() {
        if(!this.svgTimeLineContainer) return;

        if(!this.state.artist.exhibitedExhibitions) return;

        // draw timeline of artists and their exhibitions over time
        const timeline = this.svgTimeLineContainer.select('.timeline-container');

        if(!timeline) return;

        // iterate over exhibitions array and calculate total amount of exhibitions per year
        const exhibitionsPerYear = new Map<number, number>();
        
        this.state.artist.exhibitedExhibitions.forEach((exhibition: Exhibition) => {
            const year = +exhibition.startdate;
            if(exhibitionsPerYear.has(year)) {
                const count = exhibitionsPerYear.get(year) || 0;
                exhibitionsPerYear.set(year, count + 1);
            } else {
                exhibitionsPerYear.set(year, 1);
            }
        });

        // convert exhibitions by year to array
        const data = [...exhibitionsPerYear].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        this.yearExtent = d3.extent(data, (d: { year: number, count: number }) => d.year);
        this.countExtent = d3.extent(data, (d: { year: number, count: number }) => d.count);

        console.log(this.yearExtent);
        console.log(this.countExtent);

        // if(!data.length) return; // TODO: Handle no data

        // const xExt = d3.extent(data, (d: { year: number, count: number }) => d.year);
        // this.xScale?.domain(this.yearExtent as Array<number>);
        this.xScale?.domain([1900, 1920]);
        // this.xScale?.domain(xExt as Array<number>);      

        // fill in missing years in data with 0s
        // const minYear = this.yearExtent[0] || 0;
        // const maxYear = this.yearExtent[1] || 0;
        const minYear = 1900;
        const maxYear = 1920;
        
        const years: Array<number> = Array.from(Array(maxYear - minYear + 1).keys()).map((i) => i + minYear);
        
        console.log(years)

        const dataWithMissingYears = years.map((year: number) => {
            const yearData = data.find((d: { year: number, count: number }) => {
                return d.year === year
            });
            if(yearData) {
                return yearData;
            } else {
                return { year, count: 0 };
            }
        });

        console.log(dataWithMissingYears);
        
        const yExt = d3.extent(dataWithMissingYears, (d: { year: number, count: number }) => d.count);
        // this.yScale?.domain(this.state.countExtent as Array<number>);
        this.yScale?.domain(yExt as Array<number>);

        const lineGenerator =  d3.line<{ year: number, count: number }>()
        .curve(d3.curveMonotoneX)
        .x((d: { year: number, count: number }) => {
            return this.xScale ? this.xScale(d.year) : 0;
        })
        .y((d: { year: number, count: number }) => {
            return this.yScale ? this.yScale(d.count) : 0;
        });

        timeline
            .selectAll('path')
            .data(dataWithMissingYears)
            .join('path')
            .attr('d', lineGenerator.bind(this)(dataWithMissingYears))
            .attr('stroke', 'skyblue')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('class', 'timeline-path')

        timeline.exit().remove();

        // add axis
        const xAxis = d3.axisBottom(this.xScale as d3.AxisScale<number>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        // format ticks
        xAxis.tickFormat(d3.format('d'));
        yAxis.tickFormat(d3.format('d'));

        this.svgTimeLineContainer.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0, ${this.height - this.margin.bottom})`)
            .call(xAxis);

        this.svgTimeLineContainer.append('g')
            .attr('class', 'y-axis')
            .attr('transform', `translate(${this.margin.left}, 0)`)
            .call(yAxis);

        // add labels
        this.svgTimeLineContainer.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', this.width / 2)
            .attr('y', this.height - this.margin.bottom / 2)
            .attr('text-anchor', 'middle')
            .text('Year');

        this.svgTimeLineContainer.append('text')
            .attr('class', 'y-axis-label')
            .attr('x', -this.height / 2)
            .attr('y', this.margin.left / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Exhibitions');

        // add title
        this.svgTimeLineContainer.append('text')
            .attr('class', 'title')
            .attr('x', this.width / 2)
            .attr('y', this.margin.top)
            .attr('text-anchor', 'middle')
            .text('Exhibitions over time');

        // add tooltip
        const tooltip = this.svgTimeLineContainer.append('g')
            .attr('class', 'tooltip')
            .style('display', 'none');

        tooltip.append('rect')
            .attr('width', 60)
            .attr('height', 20)
            .attr('fill', 'white')
            .style('opacity', 0.5);

        tooltip.append('text')
            .attr('x', 30)
            .attr('dy', '1.2em')
            .style('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold');

        timeline.selectAll('.base-circle')
            .data(dataWithMissingYears)
            .join('circle')
            .attr('cx', (d: { year: number, count: number }) => this.xScale ? this.xScale(d.year) : 0)
            .attr('cy', (d: { year: number, count: number }) => this.yScale ? this.yScale(d.count) : 0)
            .attr('r', 6)
            .attr('class', 'base-circle')
            .attr('fill', 'white')
            .attr('stroke', 'skyblue')
            .attr('stroke-width', 3)
            .on('mouseover', (event: any, d: { year: number, count: number }) => {
                tooltip.style('display', 'block');
                tooltip.select('text').text(`${d.count} exhibitions in ${d.year}`);
                // set position of tooltip
                const xPos = this.xScale ? this.xScale(d.year) : 0;
                const yPos = this.yScale ? this.yScale(d.count) : 0;

                tooltip.attr('transform', `translate(${xPos}, ${yPos - 30})`);
            })
            .on('mouseout', () => {
                tooltip.style('display', 'none');
            });

        // add legend
        // const legend = this.svgContainer.append('g')
        //     .attr('class', 'legend')
        //     .attr('transform', `translate(${this.width - this.margin.right - 20}, ${this.margin.top})`);

        // legend.append('circle')
        //     .attr('cx', 0)
        //     .attr('cy', 0)
        //     .attr('r', 5)
        //     .attr('fill', 'skyblue');

        // legend.append('text')
        //     .attr('x', 10)
        //     .attr('y', 5)
        //     .attr('font-size', '12px')
        //     .text('Exhibitions');

        // add compare with line
        
    }

    dragstarted(event: any, d: any) {
            if (!event.active) this.simulation?.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
    dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
    dragended(event: any, d: any) {
            if (!event.active) this.simulation?.alphaTarget(0);
            d.fx = null;
            d.fy = null;
    }
    
    drawNetwork() {
        // draw network of artists and their exhibitions together
        if(!this.svgNetworkContainer) return;

        const network = this.svgNetworkContainer.select('.network-container');

        if(!network) return;

        const data = this.state.artist.exhibitedWithArtists?.map((artist: Artist) => {
            return {
                source: this.state.artist.id,
                target: artist.id
            }
        });

        console.log(data)

        if(!data) return;

        this.simulation = d3.forceSimulation(data as Array<d3.SimulationNodeDatum>) 
            .force('link', d3.forceLink().id((d: any) => d.id))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));

        const link = network.selectAll('line')
            .data(data)
            .join('line')
            .attr('stroke', 'black')
            .attr('stroke-width', 1);

        const node = network.selectAll('circle')
            .data(data)
            .join('circle')
            .attr('r', 5)
            .attr('fill', 'skyblue')
            .on('start', this.dragstarted.bind(this))
            .on('drag', this.dragged.bind(this))
            .on('end', this.dragended.bind(this));

        // add labels ontop of nodes
        const labels = network.selectAll('text')
            .data(data)
            .join('text')
            .attr('class', 'network-label')
            .attr('x', (d: any) => d.x)
            .attr('y', (d: any) => d.y)
            .text((d: any) => d.id);
        
        this.simulation.on('tick', () => {
            link
                .attr('x1', (d: any) => d.source.x)
                .attr('y1', (d: any) => d.source.y)
                .attr('x2', (d: any) => d.target.x)
                .attr('y2', (d: any) => d.target.y);

            node
                .attr('cx', (d: any) => d.x)
                .attr('cy', (d: any) => d.y);

            labels
                .attr('x', (d: any) => d.x)
                .attr('y', (d: any) => d.y);
        });
    }

    drawCompare() {
        // draw bars on each year to compare with other artist
        if(!this.svgTimeLineContainer) return;

        if(!this.state.artist.exhibitedExhibitions) return;

        if(!this.state.compareWith) return;

        const timeline = this.svgTimeLineContainer.select('.timeline-container');

        if(!timeline) return;

        console.log('comparing');

       // from this.state.compareWith artist calculate total amount of exhibitions per year
        const exhibitionsPerYear = new Map<number, number>();

        this.state.compareWith?.exhibitedExhibitions?.forEach((exhibition: Exhibition) => {
            const year = +exhibition.startdate;
            if(exhibitionsPerYear.has(year)) {
                const count = exhibitionsPerYear.get(year) || 0;
                exhibitionsPerYear.set(year, count + 1);
            } else {
                exhibitionsPerYear.set(year, 1);
            }
        });

        // convert exhibitions by year to array
        const data = [...exhibitionsPerYear].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

        // fill in missing years in data with 0s
        const minYear = 1900;
        const maxYear = 1920;

        const years: Array<number> = Array.from(Array(maxYear - minYear + 1).keys()).map((i) => i + minYear);

        const dataWithMissingYears = years.map((year: number) => {
            const yearData = data.find((d: { year: number, count: number }) => {
                return d.year === year
            });
            if(yearData) {
                return yearData;
            } else {
                return { year, count: 0 };
            }
        });

        const lineGenerator =  d3.line<{ year: number, count: number }>()
        .curve(d3.curveMonotoneX)
        .x((d: { year: number, count: number }) => {
            return this.xScale ? this.xScale(d.year) : 0;
        })
        .y((d: { year: number, count: number }) => {
            return this.yScale ? this.yScale(d.count) : 0;
        });

        timeline
            .selectAll('.compare-path')
            .data(dataWithMissingYears)
            .join('path')
            .attr('d', lineGenerator.bind(this)(dataWithMissingYears))
            .attr('stroke', 'red')
            .attr('stroke-width', 2)
            .attr('fill', 'none')
            .attr('class', 'compare-path');

        timeline
            .selectAll('.compare-circle')
            .data(dataWithMissingYears)
            .join('circle')
            .attr('class', 'compare-circle')
            .attr('cx', (d: { year: number, count: number }) => this.xScale ? this.xScale(d.year) : 0)
            .attr('cy', (d: { year: number, count: number }) => this.yScale ? this.yScale(d.count) : 0)
            .attr('r', 6)
            .attr('fill', 'white')
            .attr('stroke', 'red')
            .attr('stroke-width', 3)
            // .on('mouseover', (event: any, d: { year: number, count: number }) => {
            //     tooltip.style('display', 'block');
            //     tooltip.select('text').text(`${d.count} exhibitions in ${d.year}`);
            //     // set position of tooltip
            //     const xPos = this.xScale ? this.xScale(d.year) : 0;
            //     const yPos = this.yScale ? this.yScale(d.count) : 0;

            //     tooltip.attr('transform', `translate(${xPos}, ${yPos - 30})`);
            // })
            // .on('mouseout', () => {
            //     tooltip.style('display', 'none');
            // });

        

        // find common exhibitions and draw bars
        const commonExhibitions = this.state.artist.exhibitedExhibitions?.filter((exhibition: Exhibition) => {
            return this.state.compareWith?.exhibitedExhibitions?.find((e: Exhibition) => e.id === exhibition.id);
        });

        console.log(commonExhibitions);

        const commonExhibitionsPerYear = new Map<number, number>();

        commonExhibitions?.forEach((exhibition: Exhibition) => {
            const year = +exhibition.startdate;
            if(commonExhibitionsPerYear.has(year)) {
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
            if(yearData) {
                return yearData;
            } else {
                return { year, count: 0 };
            }
        });

        console.log(commonExhibitionsDataWithMissingYears);

        // draw rectangles for common exhibitions on timeline
        timeline
            .selectAll('.common-exhibition')
            .data(commonExhibitionsDataWithMissingYears)
            .join('rect')
            .attr('class', 'common-exhibition')
            .attr('x', (d: { year: number, count: number }) => this.xScale ? this.xScale(d.year) -  25: 0)
            .attr('y', (d: { year: number, count: number }) => this.yScale ? this.yScale(d.count) : 0)
            .attr('width', (d: { year: number, count: number }) => {
                return 50;
                // return x - (this.xScale ? this.xScale(d.year) : 0);
            })
            .attr('height', (d: { year: number, count: number }) => {
                return this.yScale ? this.yScale(0) - this.yScale(d.count) : 0;
                // return y - (this.yScale ? this.yScale(d.count) : 0);
            })
            .attr('fill', 'purple')
            .attr('opacity', 0.5);        

            timeline.exit().remove();
    }

    onArtistChange(artistId: string) {
        this.setState({ compareWith: null });

        const artist = this.state.artist.exhibitedWithArtists?.find((artist: Artist) => artist.id === artistId);
        console.log(artist);

        if(artist) {
            this.setState({ compareWith: artist });
            this.drawCompare();
        }
    }

    formatDate(date: Date | string | undefined) {
        if(!date) return '';

        const dateObj = new Date(date);
        return `${dateObj.getFullYear()}`; // -${dateObj.getMonth()}-${dateObj.getDay()
    }

    render() {
        return (
            <>
                { this.state.artist && 
                    <div>
                        <h1>{this.state.artist.firstname} {this.state.artist.lastname} ({this.state.artist.country})</h1>
                        <h2>{this.formatDate(this.state.artist.birthdate)}({this.state.artist.birthplace}) - {this.formatDate(this.state.artist.deathdate)}({this.state.artist.deathplace})</h2>
                        <h3>{this.state.artist.exhibitedExhibitions?.length} exhibitions</h3>

                        <svg id="artist-detail-timeline"></svg>
                        <svg id="artist-detail-network"></svg>

                    <select className="flex-shrink-0 z-10 inline-flex items-center py-2 px-4 text-sm font-medium text-center bg-black text-white border border-gray-300" name="artist" id="artist-select" onChange={(e) => this.onArtistChange(e.target.value)}>
                            {this.state.artist.exhibitedWithArtists && this.state.artist.exhibitedWithArtists.map((artist: Artist) => {
                                return <option className="inline-flex w-full px-4 py-2 text-sm text-white bg-black hover:bg-gray-100" key={artist.id} value={artist.id}>{artist.firstname} {artist.lastname}</option>
                            }
                            )}
                        </select>
                    </div>
                }
            </>
        );
    }
};

export default ArtistDetailComponent;