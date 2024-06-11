import React from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import _ from 'lodash';

class AreaChartComponent extends React.Component<{ links: Array<Link>, colors?: Map<string, string>, stacked?: boolean, onclick?: Function }, { links: Array<Link>, width: number, height: number, stacked: boolean }> {
    private svgContainer: d3.Selection<any, any, any, any> | undefined;
    private color: d3.ScaleOrdinal<string, string>;
    private xAxis: d3.Selection<any, any, any, any> | undefined;
    private yAxis: d3.Selection<any, any, any, any> | undefined;
    private tooltip: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };
    private minYear: number = 1905;
    private maxYear: number = 1915;

    constructor(props: { links: Array<Link>, colors: Map<string, string>, stacked?: boolean, onclick?: Function }) {
        super(props);
        this.state = {
            links: props.links,
            width: 0,
            height: 0,
            stacked: props.stacked ? props.stacked : false
        }

        this.color = d3.scaleOrdinal<string>(d3.schemeCategory10);
        this.xScale = undefined;
        this.yScale = undefined;
        
        this.margin = {
            top: 30,
            bottom: 30,
            left: 30,
            right: 30
        };

        this.tooltip = undefined;
    }

    componentDidMount() {
        const width = document.getElementById('area-chart-container')?.clientWidth;
        const height = document.getElementById('area-chart-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });

        // set resize handler to window
        window.addEventListener('resize', this.onResize);
    }


    onResize = () => {
        const width = document.getElementById('area-chart-container')?.clientWidth;
        const height = document.getElementById('area-chart-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
    }

    calculateCoExhibitorCountryDistribution() {
        // coexhibitor map over the years of the artist according to their country
        const coExhibitorCountryDistribution = new Map<number, Map<string, number>>();

        // show only links with a count >= 3
        // iterate over the artist's links
        this.state.links
        .filter((link: Link) => {
            const sum = this.state.links
            .filter((l: Link) => {
                return l.targetId == link.targetId && link.target.props.data.country != '\\N';
            })
            .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
            return sum >= 3 && (link.props.data.year >= this.minYear && link.props.data.year <= this.maxYear);
        })
        // _.uniqBy(this.state.links, (link: Link) => link.target.id)
        .forEach((link: Link) => {
            const year = link.props.data.year;
            const country = link.target.props.data.country;
            // if the year is not in the map, add it
            if (!coExhibitorCountryDistribution.has(year)) {
                // and add the country to the year with a count of 1
                coExhibitorCountryDistribution.set(year, new Map<string, number>());
                coExhibitorCountryDistribution.get(year)?.set(country, 1);
            }
    
            // if the year is in the map, check if the country is in the year map 
            if (!coExhibitorCountryDistribution.get(year)?.has(country)) {
                // if not, add the country with a count of 1
                coExhibitorCountryDistribution.get(year)?.set(country, 1);
            } else {
                // increment the co-exhibitor's count
                coExhibitorCountryDistribution.get(year)?.set(country, coExhibitorCountryDistribution.get(year)?.get(country) as number + 1);
            }
        });

        // get a unique set of countries
        // const countries = new Set<string>();
        // coExhibitorCountryDistribution.forEach((value, key) => {
        //     value.forEach((value, key) => {
        //         countries.add(key);
        //     });
        // });

        // auto-fill missing years
        // for (let year = this.minYear; year <= this.maxYear; year++) {
        //     if (!coExhibitorCountryDistribution.has(year)) {
        //         coExhibitorCountryDistribution.set(year, new Map<string, number>());
                // fill the year with the countries and a count of 0
                // countries.forEach((country: string) => {
                //     coExhibitorCountryDistribution.get(year)?.set(country, 0);
                // });
        //     }
        // }
        
        // sort map by year
        return new Map([...coExhibitorCountryDistribution.entries()].sort());
    }


    init() {
        // calculate distribution over the years of the artist's co-exhibitors according to their country
        const coExhibitorCountryDistribution = this.calculateCoExhibitorCountryDistribution();

        const countryDataOverTime = new Array<{ country: string, data: Array<{ year: number, count: number }> }>();
        const countryData = new Map<string, Map<number, number>>();
        coExhibitorCountryDistribution.forEach((values, year) => {
            values.forEach((value, key) => {
                if (!countryData.has(key)) {
                    countryData.set(key, new Map<number, number>());
                    countryData.get(key)?.set(year, value);
                } else {
                    countryData.get(key)?.set(year, value);
                }    
            });
        });

        countryData.forEach((values, key) => {
            const valuesAsArray = new Array<{ year: number, count: number }>();
            values.forEach((value, key) => {
                valuesAsArray.push({ year: key, count: value });
            });
            // fill missing years with count 0
            for (let year = this.minYear; year <= this.maxYear; year++) {
                if (!values.has(year)) {
                    valuesAsArray.push({ year: year, count: 0 });
                }
            }
            // sort by year
            valuesAsArray.sort((a, b) => a.year - b.year);

            countryDataOverTime.push({ country: key, data: valuesAsArray });
        });


        this.svgContainer = d3.select('#area-chart')
            .attr('width', this.state.width)
            .attr('height', this.state.height)
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('overflow', 'visible');


        this.xScale = d3.scaleLinear<number, number, never>().range([this.margin.left * 2, this.state.width - (this.margin.right / 2)]);
        this.yScale = d3.scaleLinear<number, number, never>().range([this.state.height - this.margin.top, this.margin.top]);
        
        // set domains
        this.xScale.domain([this.minYear, this.maxYear]);
        // get max count of co-exhibitors over the years
        const maxCount = d3.max(countryDataOverTime, (d) => d3.max(d.data, (d) => d.count) as number);
        this.yScale.domain([0, maxCount || 0]);

        console.log(this.yScale.domain());

        this.xAxis = this.svgContainer.append('g');
        this.yAxis = this.svgContainer.append('g');

        if(this.props.colors) {
            this.color = d3.scaleOrdinal<string, string>()
                .domain(Array.from(this.props.colors.keys()))
                .range(Array.from(this.props.colors.values()));
        }

        this.xAxis
            .attr('transform', `translate(0, ${this.state.height - this.margin.bottom})`)
            .attr('class', 'x-axis');

        this.yAxis
            .attr('transform', `translate(${this.margin.left + 10}, 0)`)
            .attr('class', 'y-axis');

        this.svgContainer.append('text')
            .attr('class', 'x-axis-label')
            .attr('x', this.state.width / 2)
            .attr('y', this.state.height - this.margin.bottom + 36)
            .attr('text-anchor', 'middle')
            .text('Year');

        this.svgContainer.append('text')
            .attr('class', 'y-axis-label')
            .attr('x', -this.state.height / 2)
            .attr('y', this.margin.left / 2)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Co-Exhibitor Nationalities');

        // add title
        this.svgContainer.append('text')
            .attr('class', 'title')
            .attr('x', this.state.width / 2)
            .attr('y', -this.margin.top)
            .attr('text-anchor', 'middle')
            .text('Co-Exhibitor Nationalities over time');

        if (this.state.stacked) {
            this.drawStackedChart(countryDataOverTime);
        } else {
            this.drawChart(countryDataOverTime);
        }
    }

    drawStackedChart(data: Array<{ country: string, data: Array<{ year: number, count: number }> }>) {
        if(!this.svgContainer) return;

        const margin = { top: 20, right: 20, bottom: 30, left: 50 };

        const width = this.state.width - margin.left - margin.right;
        const height = this.state.height - margin.top - margin.bottom; 
        const xAxis = d3.axisBottom(this.xScale as unknown as d3.AxisScale<string>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        xAxis.tickFormat((d: string) => d3.format('d')(parseInt(d)));
        yAxis.tickFormat(d3.format('d')).ticks(5);

        this.xAxis?.call(xAxis);
        this.yAxis?.call(yAxis);

        // flatten the data as a single array
        const flatData = data.map((d) => d.data.map((dd) => ({ country: d.country, year: dd.year, count: dd.count }))).flat();
        
        this.svgContainer.append('g')
            .attr('transform', `translate(0, ${height})`)

        // stack the data by country over the years
        const stack = d3.stack<any>()
            .keys(d3.union(flatData.map(d => d.country)))
            .value(([, D], key) => D.get(key).count) // get value for each series key and stack
            (d3.index(flatData, d => d.year, d => d.country)); // group by stack then series key

        const yMax = d3.max(stack, d => d3.max(d, d => d[1])) as number;

        
        this.yScale = d3.scaleLinear<number, number>()
            .domain([0, yMax])
            .range([this.state.height - this.margin.top, this.margin.top]);

        const area = d3.area<any>()
            .curve(d3.curveMonotoneX)
            .x((d: any) => {
                const x = this.xScale ? this.xScale(d.data[0].toString()) : 0;
                return x as number;
            })
            .y0((d: any) => this.yScale ? this.yScale(d[0]) : 0)
            .y1((d: any) => this.yScale ? this.yScale(d[1]) : 0);

        // // Append a group for each series, and a rect for each element in the series.
        this.svgContainer.append('g')
            .selectAll()
            .data(stack)
            .join('path')
            .attr('class', 'area')
            .attr('fill', d => this.color(d.key))
            // .attr('fill-opacity', 0.15)
            // .attr('stroke', d => 'black')
            // .attr('stroke-width', 0.5)
            .attr('d', (d) => area(d) as string)
            .on('mouseover', (event, d) => {
                // get country name from the data and show tool tip at the mouse position
                const country = d.key;
                const x = event.clientX;
                const y = event.clientY;
                this.tooltip = d3.select('body').append('div')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('left', `${x}px`)
                    .style('top', `${y}px`)
                    .style('z-index', 1000)
                    .text(`${country} - ${d[d.length - 1][1]}`);

                // TODO: Find year closest to mouse position and show count for that year

                // set tooltip ontop of the chart
                this.tooltip.raise();

                // lower chart 
                d3.selectAll('.area').lower();

                // set opacity of non-selected areas to 0.5
                d3.selectAll('.area')
                    .filter((dd: any) => dd.key != d.key)
                    .attr('fill-opacity', 0.25);
            })
            .on('mouseout', () => {
                this.tooltip?.remove();

                // reset opacity of all areas
                d3.selectAll('.area')
                    .attr('fill-opacity', 1);
            });

            // BAR CHART IMPL
            // .join('g')
            // .attr('fill', d => this.color(d.key))
            // .selectAll('rect')
            // .data(D => D.map((d: any) => (d.key = D.key, d)))
            // .join('rect')
            // .attr('x', (d: any) => {
            //     const x = this.xScaleB ? this.xScaleB(d.data[0].toString()) : 0;
            //     return x as number;
            // })
            // .attr('y', d => this.yScaleB ? this.yScaleB(d[1]) : 0)
            // .attr('height', d => {
            //     console.log(d);
            //     const height = this.yScaleB ? (this.yScaleB(d[0]) - this.yScaleB(d[1])) : 0;

            //     console.log(height);

            //     return height;
            // })
            // .attr('width', this.xScaleB? this.xScaleB.bandwidth() : 0)
    }


    drawChart(data: Array<{ country: string, data: Array<{ year: number, count: number }> }>) {
        if(!this.svgContainer) return;

        const margin = { top: 20, right: 20, bottom: 30, left: 50 };

        const width = this.state.width - margin.left - margin.right;
        const height = this.state.height - margin.top - margin.bottom; 
        const xAxis = d3.axisBottom(this.xScale as d3.AxisScale<number>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        xAxis.tickFormat(d3.format('d'));
        yAxis.tickFormat(d3.format('d')).ticks(5);


        this.xAxis?.call(xAxis);
        this.yAxis?.call(yAxis);

        this.svgContainer.append('g')
            .attr('transform', `translate(0, ${height})`)

        const area = d3.area<{ year: number, count: number }>()
            .curve(d3.curveMonotoneX)
            .x((d) => this.xScale ? this.xScale(d.year) : 0)
            .y0(this.yScale ? this.yScale(0) : 0)
            .y1((d) => this.yScale? this.yScale(d.count) : 0);

        this.svgContainer.selectAll('.area')
            .data(data)
            .enter()
            .append('path')
            .attr('class', 'area')
            .attr('d', (d) => area(d.data) as string)
            .attr('fill', (d) => this.color(d.country))
            .attr('fill-opacity', 0.25)
            .attr('stroke', (d) => this.color(d.country))
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                // get country name from the data and show tool tip at the mouse position
                const country = d.country;
                const x = event.clientX;
                const y = event.clientY;
                this.tooltip = d3.select('body').append('div')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('left', `${x}px`)
                    .style('top', `${y}px`)
                    .style('z-index', 1000)
                    .text(`${country} - ${d.data[d.data.length - 1].count}`);

                // set tooltip ontop of the chart
                this.tooltip.raise();

                // lower chart 
                d3.selectAll('.area').lower();

                // set opacity of non-selected areas to 0.5
                d3.selectAll('.area')
                    .filter((dd: any) => dd.country != d.country)
                    .attr('fill-opacity', 0.25);
            })
            .on('mouseout', () => {
                this.tooltip?.remove();

                // reset opacity of all areas
                d3.selectAll('.area')
                    .attr('fill-opacity', 1);
            });


    }

    render() {
        return (
            <>
                <svg id='area-chart' width={this.state.width} height={this.state.height}></svg>
            </>
        )
    }
};

export default AreaChartComponent;