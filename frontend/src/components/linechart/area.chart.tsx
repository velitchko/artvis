import React from 'react';
import * as d3 from 'd3';
import { Artist } from '../../models/artist.model';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import _, { groupBy } from 'lodash';
import { countryColors, sexColors, ageGroupColors } from '../../colors/colors';


class AreaChartComponent extends React.Component<{ links: Array<Link>, colors?: { group: string, colors: Map<string, string> }, stacked?: boolean, groupBy?: string, onclick?: Function }, { links: Array<Link>, colors: { group: string, colors: Map<string, string> }, width: number, height: number, stacked: boolean, groupBy?: string, coEx?: number }> {
    private svgContainer: d3.Selection<any, any, any, any> | undefined;
    private xAxis: d3.Selection<any, any, any, any> | undefined;
    private yAxis: d3.Selection<any, any, any, any> | undefined;
    private tooltip: d3.Selection<any, any, any, any> | undefined;
    private xScale: d3.ScaleLinear<number, number, never> | undefined;
    private yScale: d3.ScaleLinear<number, number, never> | undefined;
    private margin: { bottom: number, left: number, right: number, top: number };
    private minYear: number = 1905;
    private maxYear: number = 1915;
    private selectedGroup: string = '';
    private ageGroupMap: Map<string, string>;

    constructor(props: { links: Array<Link>, colors: { group: string, colors: Map<string, string> }, stacked?: boolean, onclick?: Function, groupBy?: string, coEx?: number }) {
        super(props);
        this.state = {
            links: props.links,
            stacked: props.stacked || false,
            width: 0,
            height: 0,
            groupBy: props.groupBy,
            colors: props.colors,
            coEx: props.coEx || 3
        };

        this.xScale = undefined;
        this.yScale = undefined;

        this.margin = {
            top: 30,
            bottom: 30,
            left: 30,
            right: 30
        };

        this.tooltip = undefined;
        this.ageGroupMap = new Map<string, string>();
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

    calculateCoExhibitorGroupDistribution(group: string = 'country', coEx: number = 3) {
        // coexhibitor map over the years of the artist according to their country
        const coExhibitorGroupDistribution = new Map<number, Map<string, number>>();

        // show only links with a count >= 3
        // iterate over the artist's links
        this.state.links
            .filter((link: Link) => {
                const sum = this.state.links
                    .filter((l: Link) => {
                        return l.targetId == link.targetId;
                    })
                    .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
                return sum >= (coEx ? coEx : 3)  && (link.props.data.year >= this.minYear && link.props.data.year <= this.maxYear);
            })
            .forEach((link: Link) => {
                const year = link.props.data.year;
                const grouping = link.target.props[group];
                
                if(!grouping) return;
                // if the year is not in the map, add it
                if (!coExhibitorGroupDistribution.has(year)) {
                    // and add the country to the year with a count of 1
                    coExhibitorGroupDistribution.set(year, new Map<string, number>());
                    coExhibitorGroupDistribution.get(year)?.set(grouping, 1);
                }

                // if the year is in the map, check if the country is in the year map 
                if (!coExhibitorGroupDistribution.get(year)?.has(grouping)) {
                    // if not, add the country with a count of 1
                    coExhibitorGroupDistribution.get(year)?.set(grouping, 1);
                } else {
                    // increment the co-exhibitor's count
                    coExhibitorGroupDistribution.get(year)?.set(grouping, coExhibitorGroupDistribution.get(year)?.get(grouping) as number + 1);
                }
            });

        // sort map by year
        return new Map([...coExhibitorGroupDistribution.entries()].sort());
    }

    update(group?: string, coEx?: number): void {
        if(!group) group = this.state.groupBy || 'country';
        if(!coEx) coEx = this.state.coEx || 3;

        this.setState({ groupBy: group }, () => {
            // calculate distribution over the years of the artist's co-exhibitors according to their country
            const coExhibitorGroupDistribution = this.calculateCoExhibitorGroupDistribution(group, coEx);
            const groupDataOverTime = new Array<{ group: string, data: Array<{ year: number, count: number }> }>();
            const groupData = new Map<string, Map<number, number>>();
            coExhibitorGroupDistribution.forEach((values, year) => {
                values.forEach((value, key) => {
                    if (!groupData.has(key)) {
                        groupData.set(key, new Map<number, number>());
                        groupData.get(key)?.set(year, value);
                    } else {
                        groupData.get(key)?.set(year, value);
                    }
                });
            });

            groupData.forEach((values, key) => {
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

                groupDataOverTime.push({ group: key, data: valuesAsArray });
            });

            this.xScale = d3.scaleLinear<number, number, never>().range([this.margin.left * 2, this.state.width - (this.margin.right / 2)]);
            this.yScale = d3.scaleLinear<number, number, never>().range([this.state.height - this.margin.top, this.margin.top]);

            // set domains
            this.xScale.domain([this.minYear, this.maxYear]);
            // get max count of co-exhibitors over the years
            const maxCount = d3.max(groupDataOverTime, (d) => d3.max(d.data, (d) => d.count) as number);
            this.yScale.domain([0, maxCount || 0]);

            // sort groupDataOverTime by the sum of the counts of the group
            groupDataOverTime.sort((a, b) => {
                const aSum = a.data.reduce((acc, cur) => acc + cur.count, 0);
                const bSum = b.data.reduce((acc, cur) => acc + cur.count, 0);

                return aSum - bSum;
            });

            if (this.state.stacked) {
                this.drawStackedChart(groupDataOverTime);
            } else {
                this.drawChart(groupDataOverTime);
            }

            this.addLegend(groupDataOverTime.reverse()); // draw in reverse order
        });
    }


    init() {
        this.svgContainer = d3.select('#area-chart')
            .attr('width', this.state.width)
            .attr('height', this.state.height)
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('overflow', 'visible');


        this.xAxis = this.svgContainer.append('g');
        this.yAxis = this.svgContainer.append('g');

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
            .text('Number of Co-Exhibitors');

        // add title
        // this.svgContainer.append('text')
        //     .attr('class', 'title')
        //     .attr('x', this.state.width / 2)
        //     .attr('y', this.margin.top*2)
        //     .attr('text-anchor', 'middle')
        //     .text('Co-Exhibitor Groups over time');

        this.svgContainer.append('g')
            .attr('id', 'area-wrapper');

        this.svgContainer.append('g')
            .attr('id', 'legend-wrapper')
            .attr('transform', `translate(${this.state.width / 2}, 0)`);


        this.update();
    }

    drawStackedChart(data: Array<{ group: string, data: Array<{ year: number, count: number }> }>) {
        if (!this.svgContainer) return;
        console.log(data);
        this.svgContainer?.selectAll('.area').exit().remove();

        const xAxis = d3.axisBottom(this.xScale as unknown as d3.AxisScale<string>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        xAxis.tickFormat((d: string) => d3.format('d')(parseInt(d)));
        yAxis.tickFormat(d3.format('d')).ticks(5);

        this.xAxis?.call(xAxis);
        this.yAxis?.call(yAxis);

        // flatten the data as a single array
        const flatData = data.map((d: any) => d.data.map((dd: any) => ({ group: d.group, year: dd.year, count: dd.count }))).flat();

        // stack the data by country over the years
        const stack = d3.stack<any>()
            .keys(d3.union(flatData.map(d => d.group)))
            .value(([, D], key) => D.get(key).count) // get value for each series key and stack
            (d3.index(flatData, d => d.year, d => d.group)); // group by stack then series key

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

        // console.log(stack);

        // // Append a group for each series, and a rect for each element in the series.
        this.svgContainer.select('#area-wrapper')
            .selectAll('.area')
            .data(stack)
            .join('path')
            .attr('class', 'area')
            .attr('fill', (d: any) => {
                
                // console.log(this.state.colors, this.state.colors?.colors, d.key);
                return this.state.colors?.colors.get(d.key) || 'black'; // return 
            })
            .attr('fill-opacity', 1)
            .attr('stroke-width', 0)
            .attr('d', (d) => area(d) as string)
            .on('mouseover', (event, d) => {
                // get groupedBy value from the data and show tool tip at the mouse position
                const groupedBy = d.key;
                const x = event.clientX;
                const y = event.clientY;

                this.tooltip = d3.select('body').append('div')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${x}px`)
                    .style('top', `${y}px`)
                    .style('z-index', 1000)
                    .text(`${groupedBy}`);

                // set tooltip ontop of the chart
                this.tooltip.raise();

                // set opacity of non-selected areas to 0.5
                d3.selectAll('.area')
                    .filter((dd: any) => dd.key !== d.key)
                    .attr('fill-opacity', 0.25);

                // set selected area to full opacity
                d3.selectAll('.area')
                    .filter((dd: any) => dd.key === d.key)
                    .attr('fill-opacity', 1);
            })
            .on('mouseout', () => {
                this.tooltip?.remove();

                if(this.selectedGroup === '') {
                    // reset opacity of all areas
                    d3.selectAll('.area')
                        .attr('fill-opacity', 1);
                } else {
                    this.highlightGroup(this.selectedGroup);
                }
            })
            .on('click', (event, d) => {
                const group = this.ageGroupMap.get(d.key) || '';

                if(this.selectedGroup === d.key) {
                    this.selectedGroup = '';
                    this.highlightGroup('');
                    this.props.onclick?.call(this, '');
                    return;
                }
                
                this.selectedGroup = group;
                this.props.onclick?.call(this, group);
                this.highlightGroup(group);
            });
    }

    addLegend(data: Array<{ group: string, data: Array<{ year: number, count: number }> }>) {
        // clear existing legend
        this.svgContainer?.selectAll('.legend-item').remove();

        this.ageGroupMap.clear();

        // get unique groups
        const groups = new Set<string>();
        data.forEach((d: any) => {
            let label = '';
            if (this.state.colors?.group === 'ageGroup') {
                label = d.group;

                if (d.group.includes('gt')) {
                    label = `~${d.group.split('_')[1]}y older`;
                }
                if (d.group.includes('lt')) {
                    label = `~${d.group.split('_')[1]}y younger`;
                } 
            } else {
                label = d.group;
            }
            // add to map
            this.ageGroupMap.set(label, d.group);

            groups.add(label);
        });

        // add legend to the chart
        const legend = this.svgContainer?.select('#legend-wrapper');

        // center the legend
        legend?.attr('transform', `translate(${(this.state.width / 2) - (groups.size * 40) / 2}, 20)`);

        const legendItems = legend?.selectAll('.legend-item')
            .data(Array.from(groups))
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', (d, i) => `translate(${i * 40}, 0)`);


        legendItems?.append('circle')
            .attr('r', 8)
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('fill', (d: any) =>  this.state.colors?.colors.get(this.ageGroupMap.get(d) || 'black') || 'black');

        legendItems?.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('text-anchor', 'start')
            .attr('transform', 'rotate(-20)')
            .text((d: any) => d);

        legendItems?.on('mouseover', (event, d) => {
            // set opacity of non-selected areas to 0.5
            // set selected area to full opacity
            if(this.state.stacked) {
                d3.selectAll('.area')
                .filter((dd: any) => dd.key === d)
                .attr('fill-opacity', 1);
            } else {
                d3.selectAll('.area')
                .filter((dd: any) => dd.group === d)
                .attr('fill-opacity', 1);
            }
        })
            .on('mouseout', () => {
                if(this.selectedGroup === '') {
                    // reset opacity of all areas
                    d3.selectAll('.area')
                        .attr('fill-opacity', 1);
                } else {
                    this.highlightGroup(this.selectedGroup);
                }
            })
            .on('click', (event, d) => {
                if(this.selectedGroup === d) {
                    this.selectedGroup = '';
                    this.highlightGroup('');
                    this.props.onclick?.call(this, '');
                    return;
                }
                
                this.selectedGroup = d;
                this.props.onclick?.call(this, d);
                this.highlightGroup(d);
            });
    }

    drawChart(data: Array<{ group: string, data: Array<{ year: number, count: number }> }>) {
        if (!this.svgContainer) return;

        this.svgContainer?.selectAll('.area').remove();

        const xAxis = d3.axisBottom(this.xScale as d3.AxisScale<number>);
        const yAxis = d3.axisLeft(this.yScale as d3.AxisScale<number>);

        xAxis.tickFormat(d3.format('d'));
        yAxis.tickFormat(d3.format('d')).ticks(5);


        this.xAxis?.call(xAxis);
        this.yAxis?.call(yAxis);

        const area = d3.area<{ year: number, count: number }>()
            .curve(d3.curveMonotoneX)
            .x((d) => this.xScale ? this.xScale(d.year) : 0)
            .y0(this.yScale ? this.yScale(0) : 0)
            .y1((d) => this.yScale ? this.yScale(d.count) : 0);

        this.svgContainer.select('#area-wrapper')
            .selectAll('.area')
            .data(data)
            .enter()
            .append('path')
            .attr('class', 'area')
            .attr('d', (d) => area(d.data) as string)
            .attr('fill', (d: any) =>  this.state.colors?.colors.get(d.group) || 'black')
            .attr('fill-opacity', 0.25)
            .attr('stroke', (d: any) =>  this.state.colors?.colors.get(d.group) || 'black')
            .attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                // get groupedBy value from the data and show tool tip at the mouse position
                const group = (d as any).group;

                const x = event.clientX;
                const y = event.clientY;
                this.tooltip = d3.select('body').append('div')
                    .style('position', 'absolute')
                    .style('background-color', 'black')
                    .style('color', 'white')
                    .style('padding', '5px')
                    .style('border-radius', '5px')
                    .style('font-size', '12px')
                    .style('left', `${x}px`)
                    .style('top', `${y}px`)
                    .style('z-index', 1000)
                    .text(`${group}`);

                // set tooltip ontop of the chart
                this.tooltip.raise();
                
                // lower chart 
                // d3.selectAll('.area').lower();

                // set selected area to full opacity
                d3.selectAll('.area')
                    .filter((dd: any) => dd.group == group)
                    .attr('fill-opacity', 1);
            })
            .on('mouseout', () => {
                this.tooltip?.remove();

                if(this.selectedGroup === '') {
                    // reset opacity of all areas
                    d3.selectAll('.area')
                        .attr('fill-opacity', 0.25);
                } else {
                    this.highlightGroup(this.selectedGroup);
                }
            })
            .on('click', (event, d) => {
                const group = (d as any).group;

                if(this.selectedGroup === group) {
                    this.selectedGroup = '';
                    this.highlightGroup('');
                    this.props.onclick?.call(this, '');
                    return;
                }
                
                this.selectedGroup = group;
                this.props.onclick?.call(this, group);
                this.highlightGroup(group);
            });
    }

    updateColors(colors: { group: string, colors: Map<string, string> }) {
        this.setState({ colors: colors }, () => {
            this.update();
        });
    }

    highlightGroup(group: string) {
        
        // set all areas to 0.25 opacity
        d3.selectAll('.area')
            .attr('fill-opacity', 0.25);

        if(group === '')  {
            // set opacity of all areas to 1
            d3.selectAll('.area')
                .attr('fill-opacity', 1);

            return;
        }

        if(this.state.stacked) {
            d3.selectAll('.area')
                .filter((d: any) => d.key === group)
                .attr('fill-opacity', 1);
        } else {
            d3.selectAll('.area')
                .filter((d: any) => d.group === group)
                .attr('fill-opacity', 1);
        }
    }

    updateCoEx(groupBy?: string, coEx?: number) {
        this.setState({ coEx: coEx }, () => {
            this.update(groupBy, coEx);
        });
    }

    render() {
        return (
            <>
                <div className="relative float-right">
                    <label htmlFor='stacked'>Stacked</label>
                    <input 
                        type='checkbox' 
                        id='stacked'
                        onChange={(event) => {
                        this.setState({stacked: event.target.checked}, () => {
                            this.update();
                        })}}
                        checked={this.state.stacked} 
                    />
                </div>
                <svg id='area-chart' width={this.state.width} height={this.state.height}></svg>
            </>
        )
    }
};

export default AreaChartComponent;