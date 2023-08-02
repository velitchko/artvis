import React from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { extendWith, min } from 'lodash';
import { NavigateFunction } from 'react-router-dom';

class ArtistCardComponent extends React.Component<{ artist: Artist, width: number, height: number, yearExtent: Array<number> | Array<undefined>, countExtent: Array<number> | Array<undefined>, navigate: NavigateFunction }, { artist: Artist, id: string, width: number, height: number, yearExtent: Array<number>, countExtent: Array<number>, navigate: NavigateFunction }> {

    private svgContainer: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };

    constructor(props: { artist: Artist, width: number, height: number, yearExtent: Array<number>, countExtent: Array<number>, navigate: NavigateFunction }) {
        super(props);

        this.state = {
            artist: props.artist,
            id: `artist-container-${props.artist.id}`,
            width: props.width,
            height: props.height,
            yearExtent: props.yearExtent,
            countExtent: props.countExtent,
            navigate: props.navigate
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

    onArtistClick = () => {
        this.state.navigate(`/artists/${this.state.artist.id}`);
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

        // TODO: mouseover draw line and tooltip with current year

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
                <button className="float-right" onClick={ this.onArtistClick }>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1" stroke="#33363F" strokeWidth="2" />
                        <path d="M18.2265 11.3805C18.3552 11.634 18.4195 11.7607 18.4195 12C18.4195 12.2393 18.3552 12.366 18.2265 12.6195C17.6001 13.8533 15.812 16.5 12 16.5C8.18799 16.5 6.39992 13.8533 5.77348 12.6195C5.64481 12.366 5.58048 12.2393 5.58048 12C5.58048 11.7607 5.64481 11.634 5.77348 11.3805C6.39992 10.1467 8.18799 7.5 12 7.5C15.812 7.5 17.6001 10.1467 18.2265 11.3805Z" stroke="#33363F" strokeWidth="2" />
                        <path d="M17 4H17.2C18.9913 4 19.887 4 20.4435 4.5565C21 5.11299 21 6.00866 21 7.8V8M17 20H17.2C18.9913 20 19.887 20 20.4435 19.4435C21 18.887 21 17.9913 21 16.2V16M7 4H6.8C5.00866 4 4.11299 4 3.5565 4.5565C3 5.11299 3 6.00866 3 7.8V8M7 20H6.8C5.00866 20 4.11299 20 3.5565 19.4435C3 18.887 3 17.9913 3 16.2V16" stroke="#33363F" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <div className="absolute">
                    <p className="truncate">{this.state.artist.firstname} {this.state.artist.lastname} ({this.state.artist.country})</p>
                    <p className="truncate">{ this.state.artist.birthplace == '\N' ? '?' : this.state.artist.birthplace }, { this.state.artist.birthdate?.toString().split('-')[0] }</p>
                    <p className="truncate">{ this.state.artist.deathplace == '\N' ? '?' : this.state.artist.deathplace }, { this.state.artist.deathdate?.toString().split('-')[0] }</p>
                </div>
                <svg id={ this.state.id }></svg>
            </div>
            </>
        );
    }
};

export default ArtistCardComponent;