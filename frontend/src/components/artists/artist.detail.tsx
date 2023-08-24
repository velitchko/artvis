import React, { useEffect, useRef } from 'react';
import GET_ARTISTS_EXHIBITED_WITH from '../../queries/exhibitedWith';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import NetworkComponent from '../network/network';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import { useQuery } from '@apollo/client';
import client from '../apollo/client';

class ArtistDetailComponent extends React.Component<{ artist: Artist }, { artist: Artist, compareWith: Artist | null, nodes: Array<Node>, links: Array<Link> }> {

    private svgTimeLineContainer: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };
    private yearExtent: Array<number> | Array<undefined>;
    private countExtent: Array<number> | Array<undefined>;
    private width: number = 500;
    private height: number = 500;
    private minYear: number = 0;
    private maxYear: number = 0;
    private nodes: Array<Node>;
    private links: Array<Link>;
    private showNetwork: boolean = false;

    constructor(props: { artist: Artist, compareWith: Artist | null, nodes: Array<Node>, links: Array<Link> }) {
        super(props);

        this.state = {
            artist: props.artist,
            compareWith: null,
            nodes: new Array<Node>(),
            links: new Array<Link>()
        };

        this.svgTimeLineContainer = undefined;
    
        this.nodes = new Array<Node>();
        this.links = new Array<Link>();

        this.xScale = undefined;
        this.yScale = undefined;

        this.yearExtent = [];
        this.countExtent = [];

        this.width = 500;
        this.height = 500;

        this.minYear = 1905;
        this.maxYear = 1916;

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
        this.drawNetwork();
    }

    drawTimeline(update?: { newYscale: number }) {
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
        this.xScale?.domain([this.minYear, this.maxYear]);
        // this.xScale?.domain(xExt as Array<number>);      

        // fill in missing years in data with 0s
        // const minYear = this.yearExtent[0] || 0;
        // const maxYear = this.yearExtent[1] || 0;
        
        const years: Array<number> = Array.from(Array(this.maxYear - this.minYear + 1).keys()).map((i) => i + this.minYear);
        
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
        
        const yExt = d3.extent(dataWithMissingYears, (d: { year: number, count: number }) => d.count);
        // this.yScale?.domain(this.state.countExtent as Array<number>);
        update ? this.yScale?.domain([0, update.newYscale]) : this.yScale?.domain(yExt as Array<number>);
        // this.yScale?.domain(yExt as Array<number>);

        const lineGenerator =  d3.line<{ year: number, count: number }>()
        .curve(d3.curveMonotoneX)
        .x((d: { year: number, count: number }) => {
            return this.xScale ? this.xScale(d.year) : 0;
        })
        .y((d: { year: number, count: number }) => {
            return this.yScale ? this.yScale(d.count) : 0;
        });

        timeline
            .selectAll('.base-path')
            .data(dataWithMissingYears)
            .join('path')
            .attr('d', lineGenerator.bind(this)(dataWithMissingYears))
            .attr('class', 'base-path')
            .attr('stroke', 'skyblue')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.5)
            .style("stroke-dasharray", ("3, 3"))
            .attr('fill', 'none')

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

        // add average line with line
        
    }
    
    drawNetwork() {
        client.query({
            query: GET_ARTISTS_EXHIBITED_WITH,  
            variables: {
            searchId: this.state.artist.id
        }}).then(result => {
            this.nodes = result.data.artists[0].exhibitedWithArtists.map((artist: Artist) => {
                return { id: artist.id, name: artist.firstname + ' ' + artist.lastname, type: 'artist', props: { data: artist } };
            });

            // push base artist to nodes
            this.nodes.push({ id: this.state.artist.id, name: this.state.artist.firstname + ' ' + this.state.artist.lastname, type: 'artist', props: { data: this.state.artist } } );

            this.links = result.data.artists[0].exhibitedWithArtists.map((artist: Artist) => {
                return { source: this.state.artist.id, target: artist.id, value: 1 };
            });

            this.showNetwork = true;

            this.setState(prevState => ({ nodes: this.nodes, links: this.links }), () => { 
                this.showNetwork = true;
            });
            
        });
    }

    drawCompare() {
        // draw bars on each year to compare with other artist
        if(!this.svgTimeLineContainer) return;

        if(!this.state.artist.exhibitedExhibitions) return;

        if(!this.state.compareWith) return;

        const timeline = this.svgTimeLineContainer.select('.timeline-container');

        if(!timeline) return;

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
        const years: Array<number> = Array.from(Array(this.maxYear - this.minYear + 1).keys()).map((i) => i + this.minYear);

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

        // check if count is higher than base artist and draw line
        const compareMax = d3.max(dataWithMissingYears, (d: { year: number, count: number }) => d.count) as number;
        const baseMAx = this.yScale?.domain()[1] as number; 
        if(compareMax > baseMAx) {
            this.drawTimeline({ newYscale: compareMax });
        }

        const lineGenerator =  d3.line<{ year: number, count: number }>()
        .curve(d3.curveMonotoneX)
        .x((d: { year: number, count: number }) => {
            return this.xScale ? this.xScale(d.year) : 0;
        })
        .y((d: { year: number, count: number }) => {
            return this.yScale ? this.yScale(d.count) : 0;
        });
        
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
            .attr('stroke-opacity', 0.5)
            .attr('stroke-width', 3)
            .style('pointer-events', 'none').lower();

        timeline
            .selectAll('.compare-path')
            .data(dataWithMissingYears)
            .join('path')
            .attr('d', lineGenerator.bind(this)(dataWithMissingYears))
            .attr('stroke', 'red')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.5)
            .style("stroke-dasharray", ("3, 3"))
            .attr('fill', 'none')
            .attr('class', 'compare-path').lower();
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
        const commonExhibitions = this.state.compareWith.exhibitedExhibitions?.filter((exhibition: Exhibition) => {
            return this.state.artist.exhibitedExhibitions?.find((e: Exhibition) => e.id === exhibition.id);
        });

        const uniqueCommonExhibitions = Array.from(new Set(commonExhibitions));

        const commonExhibitionsPerYear = new Map<number, number>();

        uniqueCommonExhibitions?.forEach((exhibition: Exhibition) => {
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
            // this.setState({ compareWith: artist });
            this.setState(prevState => ({ compareWith: artist }), this.drawCompare);
            // this.drawCompare();
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
                        { this.showNetwork && 
                            <NetworkComponent nodes={this.nodes} links={this.links} width={this.width} height={this.height} /> 
                        }
                    
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