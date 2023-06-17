import React from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { extendWith, min } from 'lodash';

class ArtistCardComponent extends React.Component<{ artist: Artist, width: number, height: number, yearExtent: Array<number> | Array<undefined>, countExtent: Array<number> | Array<undefined> }, { artist: Artist, id: string, width: number, height: number, yearExtent: Array<number>, countExtent: Array<number> }> {

    private svgContainer: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };

    constructor(props: { artist: Artist, width: number, height: number, yearExtent: Array<number>, countExtent: Array<number> }) {
        super(props);

        this.state = {
            artist: props.artist,
            id: `artist-container-${props.artist.id}`,
            width: props.width,
            height: props.height,
            yearExtent: props.yearExtent,
            countExtent: props.countExtent
        };

        this.svgContainer = undefined;

        this.xScale = undefined;
        this.yScale = undefined;

        this.margin = {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20
        };
    }

    componentDidMount(): void {
        this.init();
    }

    init() {
        this.svgContainer = d3.select(`#${this.state.id}`)
            .attr('width', this.state.width)
            .attr('height', this.state.height)
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)

        this.svgContainer.append('g')
            .attr('class', 'timeline-container')
            .append('rect')
            .attr('width', this.state.width - (this.margin.left + this.margin.right))
            .attr('height', this.state.height - (this.margin.top + this.margin.bottom))
            .attr('fill', 'transparent')

        this.xScale = d3.scaleLinear<number, number, never>().range([this.margin.left, this.state.width - this.margin.right]);
        this.yScale = d3.scaleLinear<number, number, never>().range([this.state.height - this.margin.top, this.margin.top]);
        
        this.drawTimeline();
    }

    drawTimeline() {
        if(!this.svgContainer) return;

        if(!this.state.artist.exhibitedExhibitions) return;

        // draw timeline of artists and their exhibitions over time
        const timeline = this.svgContainer.select('.timeline-container');

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

        // if(!data.length) return; // TODO: Handle no data

        // const xExt = d3.extent(data, (d: { year: number, count: number }) => d.year);
        this.xScale?.domain(this.state.yearExtent as Array<number>);
        // this.xScale?.domain(xExt as Array<number>);      

        // fill in missing years in data with 0s
        const minYear = +this.state.yearExtent[0];
        const maxYear = +this.state.yearExtent[1];
        
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
        // TODO: color path segments based on count



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
    }    

    render() {
        return (
            <>  
            <div className="border-dashed border-2 border-sky-200 m-1">
                <div className="absolute">
                    <p className="truncate">{ this.state.artist.firstname } { this.state.artist.lastname } ({ this.state.artist.country })</p>
                    <p className="truncate">{ this.state.artist.birthplace } ({ this.state.artist.birthdate?.toString() })</p>
                    <p className="truncate">{ this.state.artist.deathplace } ({ this.state.artist.deathdate?.toString() })</p>
                </div>
                <svg id={ this.state.id }></svg>
            </div>
            </>
        );
    }
};

export default ArtistCardComponent;