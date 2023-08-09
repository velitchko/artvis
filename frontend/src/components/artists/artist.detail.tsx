import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';

class ArtistDetailComponent extends React.Component<{ artist: Artist }, { artist: Artist, compareWith: Artist | null }> {

    private svgContainer: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };
    private yearExtent: Array<number> | Array<undefined>;
    private countExtent: Array<number> | Array<undefined>;
    private width: number = 500;
    private height: number = 500;

    constructor(props: { artist: Artist, compareWith: Artist | null }) {
        super(props);

        this.state = {
            artist: props.artist,
            compareWith: null
        };

        this.svgContainer = undefined;

        this.xScale = undefined;
        this.yScale = undefined;

        this.yearExtent = [];
        this.countExtent = [];

        this.width = 500;
        this.height = 500;

        this.margin = {
            top: 20,
            bottom: 20,
            left: 20,
            right: 20
        };
    }

    componentDidMount(): void {
        this.width = window.innerWidth;

        this.init();
    }

    init() {
        const timeline = this.svgContainer?.select('.timeline-container');

        if(timeline) return;

        this.svgContainer = d3.select('#artist-detail-timeline')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)

        this.svgContainer.append('g')
            .attr('class', 'timeline-container')
            .append('rect')
            .attr('width', this.width - (this.margin.left + this.margin.right))
            .attr('height', this.height - (this.margin.top + this.margin.bottom))
            .attr('fill', 'transparent')

        this.xScale = d3.scaleLinear<number, number, never>().range([this.margin.left, this.width - this.margin.right]);
        this.yScale = d3.scaleLinear<number, number, never>().range([this.height - this.margin.top, this.margin.top]);
        
        this.drawTimeline();
    }

    drawTimeline() {
        if(!this.svgContainer) return;

        console.log(this.state.artist);
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

        this.yearExtent = d3.extent(data, (d: { year: number, count: number }) => d.year);
        this.countExtent = d3.extent(data, (d: { year: number, count: number }) => d.count);

        console.log(this.yearExtent);
        console.log(this.countExtent);

        // if(!data.length) return; // TODO: Handle no data

        // const xExt = d3.extent(data, (d: { year: number, count: number }) => d.year);
        this.xScale?.domain(this.yearExtent as Array<number>);
        // this.xScale?.domain(xExt as Array<number>);      

        // fill in missing years in data with 0s
        const minYear = this.yearExtent[0] || 0;
        const maxYear = this.yearExtent[1] || 0;
        
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

    onArtistChange(artistId: string) {
        const artist = this.state.artist.exhibitedWithArtists?.find((artist: Artist) => artist.id === artistId);
        if(artist) {
            this.setState({ compareWith: artist });
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

                        <svg id="artist-detail-timeline"></svg>
                        <select name="artist" id="artist-select" onChange={(e) => this.onArtistChange(e.target.value)}>
                            {this.state.artist.exhibitedWithArtists && this.state.artist.exhibitedWithArtists.map((artist: Artist) => {
                                return <option  key={artist.id} value={artist.id}>{artist.firstname} {artist.lastname}</option>
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