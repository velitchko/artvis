import React, { Ref } from 'react';
import _, { Dictionary, min } from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
import client from '../apollo/client';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/exhibitedWith';
import { Artist } from '../../models/artist.model';

class EgoNetworkComponent extends React.Component<{ baseNode: Node, links: Array<Link>, width?: number, height?: number, requestNode?: Function, mouseOverCallBack?: Function }, { baseNode: Node, links: Array<Link>, width: number, height: number, coEx: number, groupBy: string, selection: boolean }> {
    private svgContainer: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined;
    private gridContainer: d3.Selection<any, any, any, any> | undefined;
    private circleContainer: d3.Selection<any, any, any, any> | undefined;
    private artistContainer: d3.Selection<any, any, any, any> | undefined;
    private outerCircleContainer: d3.Selection<any, any, any, any> | undefined;
    private donutContainer: d3.Selection<any, any, any, any> | undefined;

    private tooltip: d3.Selection<any, any, any, any> | undefined;
    private rScale: d3.ScalePower<number, number>;
    private angleScale: d3.ScaleLinear<number, number>;
    private nodeRScale: d3.ScalePower<number, number>;
    private outerNodeRScale: d3.ScalePower<number, number>;
    private theta: number;
    private links: Array<Link> = [];
    private color: d3.ScaleOrdinal<string, string>;
    private minYear = 1905;
    private maxYear = 1915;

    constructor(props: { baseNode: Node, links: Array<Link>, width: number, height: number, coEx: number, groupBy: string, selection: boolean }) {
        super(props);

        this.state = {
            baseNode: props.baseNode,
            links: props.links,
            width: props.width,
            height: props.height,
            coEx: 3,
            groupBy: 'country',
            selection: false
        };

        this.svgContainer = undefined;

        this.angleScale = d3.scaleLinear();
        this.rScale = d3.scaleSqrt();
        this.nodeRScale = d3.scaleSqrt();
        this.outerNodeRScale = d3.scaleSqrt();

        this.color = d3.scaleOrdinal<string>(d3.schemeCategory10);

        this.tooltip = undefined;
        this.theta = 0;
    }

    componentDidMount(): void {
        // get ego-net-container element width and height and set state
        const width = document.getElementById('ego-net-container')?.clientWidth;
        const height = document.getElementById('ego-net-container')?.clientHeight;

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
        const width = document.getElementById('ego-net-container')?.clientWidth;
        const height = document.getElementById('ego-net-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
    }

    zoomed($event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        if (!this.svgContainer) return;
        this.svgContainer.select('#everything').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);
    }

    // request node broadcasts node id to parent
    requestNode(node: string | number) {
        // emit event to parent
        console.log('request', node)
        if (this.props.requestNode) this.props.requestNode(node);
    }

    mouseOverCallBack(year: number) {
        if (this.props.mouseOverCallBack) this.props.mouseOverCallBack(year);
    }

    init(): void {
        if (this.svgContainer) return;

        this.svgContainer = d3.select('#ego-net');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.25, 10])
            .extent([[0, 0], [this.state.width, this.state.height]])
            .on('zoom', this.zoomed.bind(this));

        this.svgContainer
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('pointer-events', 'all')
            // .style('overflow', 'visible')
            .call(zoom);

        const everything = this.svgContainer.append('g').attr('id', 'everything');

        // setup groups
        this.tooltip = everything.append('g').attr('id', 'tooltip');
        this.gridContainer = everything.append('g').attr('id', 'grid');
        this.circleContainer = everything.append('g').attr('id', 'circle-lines');
        this.artistContainer = everything.append('g').attr('id', 'artists');
        this.donutContainer = everything.append('g').attr('id', 'donut')
            .attr('transform', `rotate(90) translate(${this.state.width / 2}, ${this.state.height / 2})`)
            .attr('transform-origin', 'center');;
        this.outerCircleContainer = everything.append('g').attr('id', 'outer-circle-wrapper');

        // or everything
        const baseCircle = everything
            .append('g')
            .attr('id', 'base-circle-wrapper');

        baseCircle
            .append('circle')
            .attr('id', 'base-circle')
            .attr('cx', this.state.width / 2)
            .attr('cy', this.state.height / 2)
            .attr('r', 25)
            .attr('fill', this.color(this.state.baseNode.props.data.country));

        // append text to base circle
        const text = baseCircle
            .append('text')
            .attr('id', 'base-circle-label');

        text.append('tspan')
            .attr('x', this.state.width / 2)
            .attr('y', this.state.height / 2 - 6)
            .attr('font-size', '12px')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('fill', 'black')
            .attr('font-weight', 'bold')
            .text(this.state.baseNode.name.split(' ')[0]);

        text.append('tspan')
            .attr('x', this.state.width / 2)
            .attr('y', this.state.height / 2 + 6)
            .attr('font-size', '12px')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr('fill', 'black')
            .attr('font-weight', 'bold')
            .text(this.state.baseNode.name.split(' ')[1]);

        // setup scales 
        this.rScale = d3.scaleSqrt()
            .domain([1905, 1915])
            .range([75, 500]);

        this.angleScale = d3.scaleLinear()
            // .domain([0, 100])
            .range([0, 2 * Math.PI]);

        this.nodeRScale = d3.scaleSqrt()
            // .domain([0, 100])
            .range([2, 6]);

        this.outerNodeRScale = d3.scaleSqrt()
            // .domain([0, 100])
            .range([2, 8]);

        const targetNodes = this.filterData(this.state.coEx);
        this.links = targetNodes;

        this.gridLines(_.uniqBy(this.links, (node: Link) => node.targetId).length);
        this.drawCircle();
    }

    handleCoExChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState(prevState => ({ coEx: parseInt(event.target.value) }), () => {
            const targetNodes = this.filterData(this.state.coEx);
            this.links = targetNodes;

            this.gridLines(_.uniqBy(this.links, (node: Link) => node.targetId).length);
            this.drawCircle();
        });
    };

    handleGroupByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState(prevState => ({ groupBy: event.target.value }), () => {
            const targetNodes = this.filterData(this.state.coEx, this.state.groupBy);
            this.links = targetNodes;

            this.gridLines(_.uniqBy(this.links, (node: Link) => node.targetId).length);
            this.drawCircle();
        });
    };

    groupBy(prop: string, links: Array<Link>): Dictionary<Link[]> {

        switch (prop) {
            case 'country':
                return _.groupBy(links, (link: Link) => link.target.props.data.country);
            case 'year':
                return _.groupBy(links, (link: Link) => link.target.props.data.country);
            case 'sex':
                return _.groupBy(links, (link: Link) => link.target.props.data.sex);
            case 'age':
                return _.groupBy(links, (link: Link) => link.target.props.ageGroup);
            default:
                return _.groupBy(links);
        }
    }

    filterData(numCoEx: number, groupBy?: string): Array<Link> {
        // calculate unique target nodes from links
        // filter out links of same targetId where the sum of the count property is 1
        const filteredLinks = this.state.links.filter((link: Link) => {
            const sum = this.state.links.filter((l: Link) => {
                return l.targetId == link.targetId && link.target.props.data.country != '\\N';
            }
            )
                .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
            return sum > (numCoEx ? numCoEx : 3) && ( link.props.data.year >= this.minYear && link.props.data.year <= this.maxYear);
        });

        const groupedLinks = this.groupBy(this.state.groupBy, filteredLinks);

        let groupData: Array<{ group: string, links: Array<Link> }> = [];

        Object.entries(groupedLinks).forEach((link: [string, Array<Link>]) => {
            const group = link[0];
            const links = link[1];
            groupData.push({ group: group, links: links });
        });

        // sort group data array by percent
        groupData = _.orderBy(groupData, ['percent'], ['desc']);

        // create an array of all target ages from filteredLinks
        const targetAges = filteredLinks.map((link: Link) => {
            let age = +link.target.props.data.deathdate.split('-')[0] - +link.target.props.data.birthdate.split('-')[0];

            if (isNaN(age)) return '?';
            if (age <= 0) return '?';
            if (age > 200) return '?';

            return `${age}`;
        });

        // get the min age that isnt '?'
        const minAge = Math.min(...targetAges.map((a: string) => { return isNaN(+a) ? 200 : +a; }));

        // get max age from targetAges
        const maxAge = Math.max(...targetAges.map((a: string) => { return isNaN(+a) ? 0 : +a; }));

        // construct age groups in +/- 7 year intervals starting from source age to min and max target age
        const ageGroups = _.range(
            minAge - 7, // start
            maxAge + 7, // stop
            7); // step

        // create ranges for each age group
        const ageRanges = ageGroups.map((age: number) => {
            return `${age}-${age + 7}`;
        });

        ageRanges.unshift('?'); // For people with missing birthdate or deathdate

        const grouped = groupData.map((link: { group: string, links: Array<Link> }) => {
            link.links.forEach((l: Link) => {
                l.props.group = link.group;
                // find which age range the target node belongs to
                const age = +l.target.props.data.deathdate.split('-')[0] - +l.target.props.data.birthdate.split('-')[0];
                const index = ageRanges.findIndex((range: string) => {
                    const r = range.split('-');
                    return age >= +r[0] && age <= +r[1];
                });
                // set targetAge property to age range
                l.target.props.ageGroup = index == -1 ? '?' : ageRanges[index];
                l.target.props.age = age;
            });
            return link.links;
        })
            .flat()
            // sort by group and within each group by age
            .sort((a: Link, b: Link) => {
                if (a.props.group > b.props.group) return 1;
                if (a.props.group < b.props.group) return -1;
                if (a.target.props.age > b.target.props.age) return 1;
                if (a.target.props.age < b.target.props.age) return -1;
                return 0;
            });

        const unique = _.uniqBy(grouped, (link: Link) => link.targetId);

        // set angleScale domain to number of unique target nodes
        this.angleScale.domain([0, unique.length]); // == index of target node

        // set nodeRScale domain to maxCount
        this.nodeRScale.domain([Math.min(...grouped.map(g => g.props.data.count)), Math.max(...grouped.map(g => g.props.data.count))]);

        // iterate over unique links and find original link in filteredLinks and set link.props.originalIndex to index of unique link
        unique.forEach((link: Link, index: number) => {
            // find filtered link with same targetId
            const filteredLink = filteredLinks.filter((l: Link) => l.targetId == link.targetId);
            if (!filteredLink) return;
            filteredLink.forEach((l: Link) => {
                l.props.originalIndex = index;
            });
        });

        return grouped;
    }

    getAngle(index: number): number {
        // get the angle of the target node with id from the angleScale
        if (!this.angleScale) return 0;

        return this.angleScale(index);
    }

    getXCoordinates(date: number, angle: number, offset?: number): number {
        if (!this.rScale) return 0;

        return Math.cos(angle) * (this.rScale(date) + (offset ? offset : 0));
    }

    getYCoordinates(date: number, angle: number, offset?: number): number {
        if (!this.rScale) return 0;

        return Math.sin(angle) * (this.rScale(date) + (offset ? offset : 0));
    }

    gridLines(numTargets: number): void {
        if (!this.svgContainer) return;

        if (!this.gridContainer) return;

        this.gridContainer.selectAll('.grid-line')
            .data(d3.range(0, numTargets))
            .join('line')
            .attr('class', 'grid-line')
            .attr('stroke', '#e3e3e3')
            .attr('stroke-width', 1)
            .transition().duration(250)
            .attr('x1', (d: any, i: number) => {
                return this.getXCoordinates(this.minYear, this.angleScale(i)) + this.state.width / 2;
            })
            .attr('x2', (d: any, i: number) => {
                return this.getXCoordinates(this.maxYear, this.angleScale(i)) + this.state.width / 2;
            })
            .attr('y1', (d: any, i: number) => {
                return this.getYCoordinates(this.minYear, this.angleScale(i)) + this.state.height / 2;
            })
            .attr('y2', (d: any, i: number) => {
                return this.getYCoordinates(this.maxYear, this.angleScale(i)) + this.state.height / 2;
            });

        this.gridContainer.exit().remove();

        if (!this.circleContainer) return;

        this.circleContainer.selectAll('.circle-line')
            .data(d3.range(this.minYear, this.maxYear + 1))
            .join('circle')
            .attr('id', (d: any) => `circle-${d}`)
            .attr('class', 'circle-line')
            .attr('stroke', '#e3e3e3')
            .attr('fill', 'none')
            .attr('stroke-width', 1)
            .transition().duration(250)
            .attr('cx', this.state.width / 2)
            .attr('cy', this.state.height / 2)
            .attr('r', (d: any) => {
                return this.rScale ? this.rScale(d) : 0;
            });

        this.circleContainer.exit().remove();
    }

    drawCircle(): void {
        if (!this.svgContainer) return;

        if (!this.artistContainer) return;

        this.theta = 2 * Math.PI / _.uniqBy(this.links, (node: Link) => node.targetId).length;

        this.artistContainer
            .selectAll('circle')
            .data(this.links)
            .join('circle')
            .attr('id', (d: Link) => `node-${d.target.id}-${d.props.data.year}`)
            .transition().duration(250)
            .attr('r', (d: Link) => this.nodeRScale(d.props.data.count))
            .attr('cx', (d: Link) => {
                const x = this.getXCoordinates(d.props.data.year, this.getAngle(d.props.originalIndex)) + this.state.width / 2;
                d.target.x = x;

                return x;
            })
            .attr('cy', (d: Link) => {
                const y = this.getYCoordinates(d.props.data.year, this.getAngle(d.props.originalIndex)) + this.state.height / 2;
                d.target.y = y;

                return y;
            })
            .attr('opacity', 0.75)
            .attr('fill', (d: Link) => this.color(d.props.group));

        this.artistContainer.selectAll('circle')
            .on('mouseover', (d: PointerEvent) => {
                // get data from d 
                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as Link;

                if (!data) return;

                // show tooltip with name of target node
                if (this.tooltip) {
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');

                    // get circle cx and cy
                    const cx = d3.select(`#${id}`).attr('cx');
                    const cy = d3.select(`#${id}`).attr('cy');

                    // set tooltip position to mouse position
                    tooltip.attr('x', cx + 15);
                    tooltip.attr('y', cy + 15);

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(data.target.name);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 15)
                        .attr('dy', '2em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`(${data.props.data.year}) ${data.props.data.count} co-exhibitions`);

                    // get bbox of text
                    const bbox = text.node()?.getBBox();

                    if (bbox) {
                        // set tooltip width and height to bbox width and height
                        tooltip.attr('width', bbox.width + 20);
                        tooltip.attr('height', bbox.height + 5);
                    }

                    this.tooltip.raise();
                }

                // highlight all links with same targetId
                const links = this.links.filter((link: Link) => link.targetId == data.targetId);
                links.forEach((link: Link) => {
                    const id = `node-${link.target.id}-${link.props.data.year}`;
                    const circle = this.svgContainer?.select(`#${id}`);

                    if (!circle) return;

                    circle.attr('stroke', 'black');
                    circle.attr('stroke-width', 2);
                });

                // pass year to mouseOverCallBack
                this.mouseOverCallBack(data.props.data.year);
                this.highlightCircle(data.props.data.year);
            })
            .on('mouseout', (d: PointerEvent) => {
                // remove rect and text from tooltip
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();
                // lower tooltip 
                this.tooltip?.lower();

                // clear all highlights
                this.artistContainer?.selectAll('circle').attr('stroke', 'none');

                // pass year to mouseOverCallBack
                this.mouseOverCallBack(0);
                this.highlightCircle(0);
            });

        this.artistContainer.exit().remove();

        this.artistContainer.selectAll('.artist-label')
            .data(_.uniqBy(this.links, (node: Link) => node.target.id))
            .join('text')
            // .transition().duration(250)
            .attr('class', 'artist-label')
            .attr('id', (d: Link) => `artist-label-${d.target.id}`)
            .attr('x', (d: Link) => {
                // find angle of target node
                const angle = this.getAngle(d.props.originalIndex);
                // find x coordinate of target node
                const x = this.getXCoordinates(this.maxYear, angle, 50) + this.state.width / 2;

                return x;
            })
            .attr('y', (d: Link) => {
                // find angle of target node
                const angle = this.getAngle(d.props.originalIndex);
                // find y coordinate of target node
                const y = this.getYCoordinates(this.maxYear, angle, 50) + this.state.height / 2;

                return y;
            })
            .attr('transform', (d: Link, i: number) => {
                const x1 = 0 + this.state.width / 2;
                const y1 = 0 + this.state.height / 2;

                const x2 = this.getXCoordinates(this.maxYear, this.angleScale(d.props.originalIndex), 50) + this.state.width / 2;
                const y2 = this.getYCoordinates(this.maxYear, this.angleScale(d.props.originalIndex), 50) + this.state.height / 2;

                const dx = x2 - x1;
                const dy = y2 - y1;

                // Calculate the rotation angle in radians
                let rotationAngleRadians = Math.atan2(dy, dx);

                // Ensure the angle is non-negative (between 0 and 2*pi)
                if (rotationAngleRadians < 0) {
                    rotationAngleRadians += 2 * Math.PI;
                }

                // Ensure the angle is between 0 and 2*pi
                rotationAngleRadians %= 2 * Math.PI;

                // Convert the rotation angle from radians to degrees
                let rotationAngleDegrees = (rotationAngleRadians * 180) / Math.PI;

                // if between 90 and 270 rotate by an additional 180 degrees
                if (rotationAngleDegrees > 90 && rotationAngleDegrees < 270) {
                    rotationAngleDegrees += 180;
                }

                return `rotate(${rotationAngleDegrees}, ${x2}, ${y2})`;
            })
            .style('text-anchor', (d: any, i: number) => {
                const x1 = 0 + this.state.width / 2;
                const y1 = 0 + this.state.height / 2;

                const x2 = this.getXCoordinates(this.maxYear, this.angleScale(d.props.originalIndex), 25) + this.state.width / 2;
                const y2 = this.getYCoordinates(this.maxYear, this.angleScale(d.props.originalIndex), 25) + this.state.height / 2;

                const dx = x2 - x1;
                const dy = y2 - y1;

                // Calculate the rotation angle in radians
                let rotationAngleRadians = Math.atan2(dy, dx);

                // Ensure the angle is non-negative (between 0 and 2*pi)
                if (rotationAngleRadians < 0) {
                    rotationAngleRadians += 2 * Math.PI;
                }

                // Ensure the angle is between 0 and 2*pi
                rotationAngleRadians %= 2 * Math.PI;

                // Convert the rotation angle from radians to degrees
                const rotationAngleDegrees = (rotationAngleRadians * 180) / Math.PI;

                return (rotationAngleDegrees > 90 && rotationAngleDegrees < 270) ? 'end' : 'start';
            })
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .attr('dy', '0.35em')
            .text((d: Link) => d.target.name)
            .style('cursor', 'pointer')
            .on('mouseover', (d: PointerEvent) => {
                // get id from mouseevent target
                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as Link;
                if (!data) return;

                if (!this.state.selection) {
                    // select current label and make font-weight bold
                    const label = this.artistContainer?.select(`#${id}`);

                    if (label) label.attr('font-weight', 'bold');

                    // highlight current node
                    const circle = this.outerCircleContainer?.select(`#${id}`);
                    if (!circle) return;
                    circle.attr('stroke', 'black');
                    circle.attr('stroke-width', 2);
                    circle.attr('stroke-opacity', 1);

                    // highlight all links with same targetId 
                    const links = this.links.filter((link: Link) => link.targetId == data.targetId);
                    links.forEach((link: Link) => {
                        const circles = this.artistContainer?.selectAll('circle')
                            .filter((d: any) => {
                                return d.target.id == link.target.id
                            });

                        if (!circles) return;

                        circles.attr('stroke', 'black');
                        circles.attr('stroke-width', 2);
                    });
                }

                // show tooltip with name of target node
                if (this.tooltip) {
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');

                    // get circle cx and cy
                    const cx = +d3.select(`#${id}`).attr('x');
                    const cy = +d3.select(`#${id}`).attr('y');

                    // set tooltip position to mouse position
                    tooltip.attr('x', cx + 15);
                    tooltip.attr('y', cy + 15);

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(data.target.name);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 30)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`Age ${data.target.props.age}`);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 45)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`Group ${data.props.group}`);

                    // get sum of all counts for links with same targetId
                    const sum = this.links.filter((link: Link) => link.targetId == data.targetId)
                        .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 60)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${sum} co-exhibitions`);

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
            .on('mouseout', (d: PointerEvent) => {
                // remove rect and text from tooltip
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();

                // if state.selection is true return
                if (this.state.selection) return;

                // reset font weight of all labels
                this.artistContainer?.selectAll('.artist-label').attr('font-weight', 'normal');

                // unhightlight all nodes 
                this.outerCircleContainer?.selectAll('circle').attr('stroke', 'none');
                this.outerCircleContainer?.selectAll('circle').attr('stroke-width', 0);
                this.artistContainer?.selectAll('circle').attr('stroke', 'none');
                this.artistContainer?.selectAll('circle').attr('stroke-width', 0);

                // lower tooltip
                this.tooltip?.lower();
            })
            .on('click', (d: PointerEvent) => {
                // set state.selection to true
                this.setState(prevState => ({ selection: true }));

                // reset font weight of all labels
                this.artistContainer?.selectAll('.artist-label').attr('font-weight', 'normal');

                // ctrl+click to deselect
                if (d.ctrlKey) {
                    // set state.selection to false
                    this.setState(prevState => ({ selection: false }));

                    // unhightlight all nodes 
                    this.outerCircleContainer?.selectAll('circle').attr('stroke', 'none');
                    this.outerCircleContainer?.selectAll('circle').attr('stroke-width', 0);
                    this.artistContainer?.selectAll('circle').attr('stroke', 'none');
                    this.artistContainer?.selectAll('circle').attr('stroke-width', 0);

                    // reset all labels font weight to normal
                    this.artistContainer?.selectAll('.artist-label').attr('font-weight', 'normal');

                    // reset opacity of all nodes
                    this.artistContainer?.selectAll('circle').attr('opacity', 0.75);
                    this.outerCircleContainer?.selectAll('circle').attr('opacity', 0.75);

                    // lower tooltip
                    this.tooltip?.lower();

                    // reset opacity of labels
                    this.artistContainer?.selectAll('.artist-label').attr('opacity', 1);

                    // return
                    return;
                }

                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as Link;

                if (!data) return;

                this.requestNode(data.targetId);
                this.getSecondaryLinks(data);

                // set current label font weight to bold
                const label = this.artistContainer?.select(`#${id}`);

                if (label) label.attr('font-weight', 'bold').attr('opacity', 1);
            });

        if (!this.outerCircleContainer) return;

        // iterate over all links and sum up all counts for links with same targetId
        const sums = _.uniqBy(this.links.map((link: Link) => {
            const sum = this.links.filter((l: Link) => l.targetId == link.targetId)
                .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);

            return { targetId: link.targetId, sum: sum };
        }), (node: { targetId: string, sum: number }) => node.targetId);

        // set outerNodeRScale domain to min and max sum
        this.outerNodeRScale.domain([Math.min(...sums.map((node: { targetId: string, sum: number }) => node.sum)), Math.max(...sums.map((node: { targetId: string, sum: number }) => node.sum))]);

        // draw circles on the outside one for each unique target node 
        this.outerCircleContainer.selectAll('circle')
            .data(_.uniqBy(this.links, (node: Link) => node.target.id))
            .join('circle')
            .attr('id', (d: Link) => `outer-circle-${d.target.id}`)
            .transition().duration(250)
            .attr('r', (d: Link) => {
                // sum up all counts of links with same targetId
                const sum = this.links.filter((link: Link) => link.targetId == d.targetId)
                    .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);

                // set radius to sum
                return this.outerNodeRScale(sum);
            })
            .attr('cx', (d: Link) => (Math.cos(this.getAngle(d.props.originalIndex)) * 535) + this.state.width / 2)
            .attr('cy', (d: Link) => (Math.sin(this.getAngle(d.props.originalIndex)) * 535) + this.state.height / 2)
            .attr('opacity', 0.75)
            .attr('fill', (d: Link) => this.color(d.props.group))
            .style('cursor', 'pointer');

        this.outerCircleContainer
            .on('mouseover', (d: MouseEvent) => {
                // get id from mouseevent target
                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as Link;
                if (!data) return;

                if (!this.state.selection) {
                    // highlight current node
                    const circle = this.outerCircleContainer?.select(`#${id}`);
                    if (!circle) return;
                    circle.attr('stroke', 'black');
                    circle.attr('stroke-width', 2);
                    circle.attr('stroke-opacity', 1);

                    // highlight all links with same targetId 
                    const links = this.links.filter((link: Link) => link.targetId == data.targetId);
                    links.forEach((link: Link) => {
                        const circles = this.artistContainer?.selectAll('circle')
                            .filter((d: any) => {
                                return d.target.id == link.target.id
                            });

                        if (!circles) return;

                        circles.attr('stroke', 'black');
                        circles.attr('stroke-width', 2);
                    });
                }

                // show tooltip with name of target node
                if (this.tooltip) {
                    // this.tooltip.style('display', 'block');
                    // set tooltip border to red and fill to white
                    const tooltip = this.tooltip.append('rect');
                    tooltip.attr('fill', 'black');

                    // get circle cx and cy
                    const cx = +d3.select(`#${id}`).attr('cx');
                    const cy = +d3.select(`#${id}`).attr('cy');

                    // set tooltip position to mouse position
                    tooltip.attr('x', cx + 15);
                    tooltip.attr('y', cy + 15);

                    // append text to tooltip
                    const text = this.tooltip.append('text');

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 15)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(data.target.name);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 30)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`Age ${data.target.props.age}`);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 45)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`Group ${data.props.group}`);

                    // get sum of all counts for links with same targetId
                    const sum = this.links.filter((link: Link) => link.targetId == data.targetId)
                        .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);

                    text.append('tspan')
                        .attr('x', cx + 15)
                        .attr('y', cy + 60)
                        .attr('dy', '1em')
                        .attr('dx', '1em')
                        .attr('font-size', '12px')
                        .attr('fill', 'white')
                        .attr('font-weight', 'bold')
                        .text(`${sum} co-exhibitions`);

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
            .on('mouseout', _ => {
                // remove rect and text from tooltip
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();

                // if state.selection is true return
                if (this.state.selection) return;

                // unhightlight all nodes 
                this.outerCircleContainer?.selectAll('circle').attr('stroke', 'none');
                this.outerCircleContainer?.selectAll('circle').attr('stroke-width', 0);
                this.artistContainer?.selectAll('circle').attr('stroke', 'none');
                this.artistContainer?.selectAll('circle').attr('stroke-width', 0);

                // lower tooltip
                this.tooltip?.lower();
            })
            .on('click', (d: MouseEvent) => {
                // set state.selection to true
                this.setState(prevState => ({ selection: true }));

                // ctrl+click to deselect
                if (d.ctrlKey) {
                    // set state.selection to false
                    this.setState(prevState => ({ selection: false }));

                    // unhightlight all nodes 
                    this.outerCircleContainer?.selectAll('circle').attr('stroke', 'none');
                    this.outerCircleContainer?.selectAll('circle').attr('stroke-width', 0);
                    this.artistContainer?.selectAll('circle').attr('stroke', 'none');
                    this.artistContainer?.selectAll('circle').attr('stroke-width', 0);

                    // reset opacity of all nodes
                    this.artistContainer?.selectAll('circle').attr('opacity', 0.75);
                    this.outerCircleContainer?.selectAll('circle').attr('opacity', 0.75);

                    // reset opacity of labels
                    this.artistContainer?.selectAll('.artist-label').attr('opacity', 1);

                    // lower tooltip
                    this.tooltip?.lower();

                    return;
                }

                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as Link;

                if (!data) return;

                this.requestNode(data.targetId);
                this.getSecondaryLinks(data);
            });

        this.outerCircleContainer.exit().remove();

        // donut chart
        if (!this.donutContainer) return;
    
        // create arc generator
        const arc = d3.arc<Link>()
                    .innerRadius(this.rScale(this.maxYear) + 10)
                    .outerRadius(this.rScale(this.maxYear) + 25)
                    .startAngle((d: Link) => {
                        let first: Link | undefined;
                        let last: Link | undefined;
                        for (let i = 0; i < this.links.length; i++) {
                            if (this.links[i].props.group == d.props.group) {
                                first = this.links[i];
                                break;
                            }
                        }
                        for (let i = this.links.indexOf(first as Link); i < this.links.length; i++) {
                            if (this.links[i].props.group != d.props.group) {
                                last = this.links[i + 1];
                                break;
                            }
                        }
                        // handle last element
                        if (!last) {
                            last = this.links[this.links.length - 1];
                            return this.getAngle(last?.props.originalIndex) + this.theta;
                        } else {
                            return this.getAngle(last?.props.originalIndex);
                        }
                    })
                    .endAngle((d: Link) => {
                        let first: Link | undefined;
                        for (let i = 0; i < this.links.length; i++) {
                            if (this.links[i].props.group == d.props.group) {
                                first = this.links[i];
                                break;
                            }
                        }
                        return this.getAngle(first?.props.originalIndex) - 0.01;
                    })

        this.donutContainer.selectAll('path')
            .data(_.uniqBy(this.links, (node: Link) => node.props.group))
            .join('path')
            .attr('class', 'donut')
            .attr('fill', (d: any) => this.color(d.props.group))
            .attr('id', (d: any) => `donut-${d.props.group}`)
            .attr('stroke', 'none')
            .attr('stroke-width', 1)
            .attr('d', (d: any) => {
                return arc(d);
            })
            .style('cursor', 'pointer')
            .on('mouseover', (d: PointerEvent) => {
               // TODO: make tooltip
            })
            .on('mouseout', (d: PointerEvent) => {
                // remove rect and text from tooltip
                this.tooltip?.selectAll('rect').remove();
                this.tooltip?.selectAll('text').remove();

                // lower tooltip
                this.tooltip?.lower();
            });;

        // append text to donut chart
        this.donutContainer.selectAll('text')
            .data(_.uniqBy(this.links, (node: Link) => node.props.group))
            .join('text')
            .attr('class', 'donut-label')
            .attr('id', (d: any) => `donut-label-${d.props.group}`)
            // set text to d.props.group
            .text((d: any) => d.props.group)
            .attr('font-size', '12px')
            .attr('dy', '0.35em')
            .attr('fill', 'black')
            .attr('text-anchor', 'middle')
            .attr('x', (d: Link) => arc.centroid(d)[0])
            .attr('y', (d: Link) => arc.centroid(d)[1])
            .attr('transform', (d: Link) => {
                const x2 = arc.centroid(d)[0];
                const y2 = arc.centroid(d)[1];
                
                return `rotate(-90, ${x2}, ${y2})`;
            });

        this.donutContainer.exit().remove();
    }

    getSecondaryLinks(node: Link): void {
        // for each targetNode make a request to get the exhibitedWithArtists for that node
        client.query({
            query: GET_ARTIST_EXHIBITED_WITH,
            variables: {
                searchId: node.target.id
            }
        }).then((res: any) => {
            // filter res.data.artists[0].exhibitedWithArtists to have only artists that are in targetNodes
            const exhibitors = res.data.artists[0].exhibitedWithArtists
                .filter((artist: Artist) => {
                    // check if artist is in links array
                    const link = this.links.find((link: Link) => link.target.id == artist.id);
                    return link ? true : false;
                });

            const links = new Array<Link>();
            // convert exhibitors array to links with source = baseNode and target = exhibitor
            exhibitors.forEach((exhibitor: any) => {
                const link = {
                    sourceId: `${node.target.id}`,
                    targetId: exhibitor.id,
                    props: {
                        // find originalIndex for the link in links array
                        originalIndex: this.links.find((link: Link) => link.targetId == exhibitor.id)?.props.originalIndex,
                    },
                    source: node.target,
                    target: exhibitor
                };

                // add link to links array
                links.push(link);
            });
            this.drawSecondaryLinks(`${node.target.id}`, links);
        });
    }

    drawSecondaryLinks(id: string, links: Array<Link>): void {
        const baseNode = this.links.find((link: Link) => link.targetId == id);

        if (!baseNode) return;

        // select all artist and outer circles and reduce the opacity to 0.25
        this.artistContainer?.selectAll('circle').attr('opacity', 0.25);
        this.outerCircleContainer?.selectAll('circle').attr('opacity', 0.25);

        // highlight all links from the links array 
        links.forEach((link: Link) => {
            const id = `outer-circle-${link.target.id}`;
            const outer = this.outerCircleContainer?.select(`#${id}`);

            if (!outer) return;

            outer
                .attr('opacity', 1)
                .attr('stroke', 'black')
                .attr('stroke-width', 2)
                .attr('stroke-opacity', 1);
        });

        // select all artist circles containing a link from the links array and set opacity to 1
        const circles = this.artistContainer?.selectAll('circle')
            .filter((d: any) => {
                return links.find((link: Link) => link.target.id == d.target.id) ? true : false;
            });

        if (!circles) return;

        circles.attr('opacity', 1);

        // highlight baseNode artist and outer circle
        const baseOuter = this.outerCircleContainer?.select(`#outer-circle-${baseNode.target.id}`);

        if (!baseOuter) return;

        baseOuter
            .attr('opacity', 1)
            .attr('stroke', 'black')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 1);

        const baseCircle = this.artistContainer?.selectAll('circle')
            .filter((d: any) => {
                return d.target.id == baseNode.target.id;
            });

        if (!baseCircle) return;

        baseCircle.attr('opacity', 1);

        this.artistContainer?.selectAll('.artist-label')
            .attr('opacity', 0.25);

        // set opacity of labels not containing a link from the links array to 0.25
        const labels = this.artistContainer?.selectAll('.artist-label')
            .filter((d: any) => {
                return links.find((link: Link) => (link.target.id == d.target.id) || (d.target.id == id)) ? true : false;
            });

        if (!labels) return;

        labels.attr('opacity', 1);

        // bring circles to front
        this.artistContainer?.raise();
        this.outerCircleContainer?.raise();
    }

    highlightCircle(year: number): void {
        // select the circle with the same year as the year passed in
        // change the stroke to yellow and make it dashed update stroke-width to 2

        if (!this.circleContainer) return;

        if (year == 0) {
            this.circleContainer.selectAll('circle')
                .attr('stroke', '#e3e3e3')
                .attr('fill', 'none')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', 0)
                .lower();
            return;
        } else {
            this.circleContainer?.select('#circle-' + year)
                .attr('stroke', 'orange')
                .attr('stroke-width', 4)
                .attr('stroke-dasharray', 5)
                .raise();
        }
    }

    highlightArtist(artist: Artist | null): void {
        // grab Link data for artist.id from outerCircleContainer
        let found = false;
        // check if artist is in ego network
        _.uniqBy(this.state.links, (l: Link) => l.target.id).forEach((a: Link) => {
            if(a.target.id == artist?.id) found = true;
        });
        

        if (!found) {
            // deselect everything
            this.setState(prevState => ({ selection: false }));

            // unhightlight all nodes 
            this.outerCircleContainer?.selectAll('circle').attr('stroke', 'none').attr('stroke-width', 0);
            this.artistContainer?.selectAll('circle').attr('stroke', 'none').attr('stroke-width', 0);

            // reset opacity of all nodes
            this.artistContainer?.selectAll('circle').attr('opacity', 0.75);
            this.outerCircleContainer?.selectAll('circle').attr('opacity', 0.75);

            // reset opacity of labels
            this.artistContainer?.selectAll('.artist-label').attr('opacity', 1).attr('font-weight', 'normal');
            return;
        }

        console.log(artist?.id + ' found')

        if (!this.outerCircleContainer) return;

        const data = this.outerCircleContainer.select(`#outer-circle-${artist?.id}`).datum() as Link;
        
        this.getSecondaryLinks(data);

        // set current label font weight to bold
        const label = this.artistContainer?.select(`#artist-label-${artist?.id}`);

        if (label) label.attr('font-weight', 'bold').attr('opacity', 1);
    }

    render() {
        return (
            <>
                <div className="absolute w-auto right-5">
                    <div className="block">
                        <label htmlFor="co-ex">Group by:</label>
                        <select id="group-by" value={this.state.groupBy} onChange={this.handleGroupByChange}>
                            <option value="country">Country</option>
                            <option value="sex">Sex</option>
                            <option value="age">Age Group</option>
                        </select>
                    </div>
                    <div className="block">
                        <label htmlFor="co-ex">Co-exhibition count: {this.state.coEx}</label>
                        <input id="co-ex" type="range" min="3" max="20" value={this.state.coEx} onChange={this.handleCoExChange} />
                    </div>
                </div>
                <svg id='ego-net' width={this.state.width} height={this.state.height}></svg>
                {/* <div id='ego-tooltip' ref={this.tooltip} className="absolute w-auto h-auto font-medium p-2 bg-black text-white"></div> */}
            </>
        )
    }
};

export default EgoNetworkComponent;