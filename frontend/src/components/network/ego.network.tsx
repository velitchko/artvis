import React, { Ref } from 'react';
import _, { Dictionary, min } from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
import client from '../apollo/client';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/exhibitedWith';
import { Artist } from '../../models/artist.model';
import { countryColors, sexColors, ageGroupColors, livingColors } from '../../colors/colors';

class EgoNetworkComponent extends React.Component<{ baseNode: Node, links: Array<Link>, colors?: { group: string, colors: Map<string, string> }, width?: number, height?: number, initCallBack?: Function, requestNode?: Function, mouseOverCallBack?: Function, groupByCallBack?: Function, arcClickCallback?: Function, filterCallback?: Function, syncColors?: Function }, { baseNode: Node, compareNode?: Node, links: Array<Link>, width: number, height: number, coEx: number, groupBy: string, orderBy: string, selection: boolean, loading: boolean, colors: { group: string, colors: Map<string, string> } }> {
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
    private minYear = 1905;
    private maxYear = 1915;
    public isInitialized: boolean = false;
    private selectedGroup: string = '';
    
    constructor(props: { baseNode: Node, compareNode?: Node, links: Array<Link>, width: number, height: number, coEx: number, groupBy: string, orderBy: string, selection: boolean, loading: boolean, colors: { group: string, colors: Map<string, string> } }) {
        super(props);

        this.state = {
            baseNode: props.baseNode,
            compareNode: undefined,
            links: props.links,
            width: props.width,
            height: props.height,
            coEx: 3,
            groupBy: 'country',
            orderBy: 'default',
            selection: false,
            loading: false,
            colors: props.colors
        };

        this.svgContainer = undefined;

        this.angleScale = d3.scaleLinear();
        this.rScale = d3.scaleSqrt();
        this.nodeRScale = d3.scaleSqrt();
        this.outerNodeRScale = d3.scaleSqrt();

        this.tooltip = undefined;
        this.theta = 0;
    }

    componentDidMount(): void {
        // get ego-net-container element width and height and set state
        const width = document.getElementById('ego-net-container')?.clientWidth;
        const height = document.getElementById('ego-net-container')?.clientHeight;

        if (!width || !height) return;

        // force color update with countries by default

        const colors = this.handleColorUpdate({ target: { value: 'country' } } as React.ChangeEvent<HTMLSelectElement>);
        this.setState(prevState => ({ width: width, height: height, colors: { group: 'country', colors: colors } }), () => {
            this.init();
        });

        // set resize handler to window
        // window.addEventListener('resize', this.onResize);
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
    requestNode(node?: number) {
        // emit event to parent
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
            .attr('r', 40)
            .attr('stroke', this.state.colors.colors.get(this.state.baseNode.props.data.country) || 'black')
            .attr('stroke-width', 4)
            .attr('fill', 'transparent');

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
            .range([100, 400]);

        this.angleScale = d3.scaleLinear()
            // .domain([0, 100])
            .range([0, 2 * Math.PI]);

        this.nodeRScale = d3.scaleSqrt()
            // .domain([0, 100])
            .range([1, 6]);

        this.outerNodeRScale = d3.scaleSqrt()
            // .domain([0, 100])
            .range([1, 6]);

        const targetNodes = this.filterData(this.state.coEx);
        this.links = targetNodes;

        this.gridLines(_.uniqBy(this.links, (node: Link) => node.targetId).length);
        this.drawCircle();

        if (this.props.initCallBack) this.props.initCallBack();
    }

    handleCoExChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newColors = this.handleColorUpdate({ target: { value: this.state.groupBy } } as React.ChangeEvent<HTMLSelectElement>);
        this.setState(prevState => ({ coEx: parseInt(event.target.value), colors: { group: this.state.groupBy, colors: newColors } }), () => {
            const targetNodes = this.filterData(this.state.coEx);
            this.links = targetNodes;

            this.gridLines(_.uniqBy(this.links, (node: Link) => node.targetId).length);
            this.drawCircle();

            if (this.props.filterCallback) this.props.filterCallback(this.state.groupBy, this.state.coEx);
        });
    };

    handleColorUpdate = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let newColors = new Map<string, string>();

        if (event.target.value == 'sex') newColors = sexColors;
        if (event.target.value == 'living') newColors = livingColors;

        if (event.target.value == 'country') {
            newColors = countryColors;

            // get unique countries from links
            const countries = _.uniq(this.state.links.map((link: Link) => link.target.props.data.country));
            const colorScale = d3.scaleOrdinal<string, string>()
                .domain(countries)
                .range(d3.schemeCategory10);
            // add new colors to color scale for countries not in color scale
            countries.forEach((country: string) => {
                if (!newColors.get(country)) {
                    newColors.set(country, colorScale(country));
                }
            });
        }

        if (event.target.value == 'ageGroup') {
            // get previously assigned colors
            newColors = this.state.colors.colors;

            // get list of all age groups
            const ageGroups = _.uniq(this.state.links.map((link: Link) => link.target.props.ageGroup));

            const parseValue = (str: string) => parseInt(str.split('_')[1], 10);

            const priorities = {
                'unknown': 4,
                'gt': 3,
                'same': 2,
                'similar': 1,
                'lt': 0
            };

            const getPriority = (str: string) => {
                if (str === 'unknown') return priorities['unknown'];
                if (str === 'same') return priorities['same'];
                if (str === 'similar') return priorities['similar'];
                if (str.startsWith('gt')) return priorities['gt'];
                if (str.startsWith('lt')) return priorities['lt'];
                return -1; // Unknown type, shouldn't happen in this case
            };

            // sort ageGroups 
            ageGroups.sort((a: string, b: string) => {
                const priorityA = getPriority(a);
                const priorityB = getPriority(b);

                if (priorityA !== priorityB) return priorityA - priorityB;

                // At this point, both a and b have the same priority, compare within their group
                if (a.startsWith('lt') && b.startsWith('lt')) {
                    return parseValue(b) - parseValue(a); // Descending order
                }

                if (a.startsWith('gt') && b.startsWith('gt')) {
                    return parseValue(a) - parseValue(b); // Ascending order
                }

                return 0; // same and similar are already at their correct position by priority
            });

            // add new colors to color scale for countries not in color scale
            ageGroups.forEach((ageGroup: string, index: number) => {
                if (!newColors.get(ageGroup)) {
                    const color = (ageGroup: string) => {
                        if (ageGroup === 'unknown') return '#333333';
                        if (ageGroup === 'similar') return ageGroupColors(0.5);
                        if (ageGroup === 'same') return '#d3d3d3';

                        return ageGroupColors(index / ageGroups.length);
                    };

                    newColors.set(ageGroup, color(ageGroup));
                }
            });
        }

        return newColors;
    };


    handleOrderByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState(prevState => ({ orderBy: event.target.value }), () => {
            const targetNodes = this.filterData(this.state.coEx);
            this.links = targetNodes;

            this.gridLines(_.uniqBy(this.links, (node: Link) => node.targetId).length);
            this.drawCircle();
        });
    }

    orderBy(prop: string, links: Array<Link>): Array<Link> {
        switch (prop) {
            case 'default':
                return _.orderBy(links, ['props.target.name'], ['asc']);
            case 'alpha':
                return _.orderBy(links, ['props.target.name'], ['asc']);
            case 'coex':
                return _.orderBy(links, (link: Link) => {
                    const sum = links
                        .filter((l: Link) => l.targetId === link.targetId)
                        .reduce((acc, cur) => acc + cur.props.data.count, 0);
                    return sum;
                }, ['desc']);
            case 'age':
                return _.orderBy(links, ['target.props.age'], ['desc']);
            default:
                return _.orderBy(links, ['target.props.name'], ['asc']);
        }
    }

    handleGroupByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newColors = this.handleColorUpdate(event);
        this.setState(prevState => ({ groupBy: event.target.value, colors: { group: event.target.value, colors: newColors } }), () => {
            const targetNodes = this.filterData(this.state.coEx);
            this.links = targetNodes;

            this.gridLines(_.uniqBy(this.links, (node: Link) => node.targetId).length);
            this.drawCircle();

            if (this.props.groupByCallBack) this.props.groupByCallBack(event.target.value);
            if (this.props.syncColors) this.props.syncColors({ group: event.target.value, colors: newColors });
        });
    };

    groupBy(prop: string, links: Array<Link>): Dictionary<Link[]> {
        switch (prop) {
            case 'country':
                return _.groupBy(links, (link: Link) => link.target.props.data.country);
            case 'year':
                return _.groupBy(links, (link: Link) => link.props.data.year);
            case 'sex':
                return _.groupBy(links, (link: Link) => link.target.props.data.sex);
            case 'ageGroup':
                return _.groupBy(links, (link: Link) => link.target.props.ageGroup);
            case 'living':
                return _.groupBy(links, (link: Link) => link.target.props.living);
            default:
                return _.groupBy(links);
        }
    }

    filterData(numCoEx: number): Array<Link> {
        // calculate unique target nodes from links
        // filter out links of same targetId where the sum of the count property is 1
        const filteredLinks = this.state.links.filter((link: Link) => {
            const sum = this.state.links
                .filter((l: Link) => {
                    return l.targetId == link.targetId && link.target.props.data.country !== null;
                })
                .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);
            return sum >= (numCoEx ? numCoEx : 3) && (link.props.data.year >= this.minYear && link.props.data.year <= this.maxYear);
        });

        const groupedLinks = this.groupBy(this.state.groupBy, filteredLinks);

        let groupData: Array<{ group: string, links: Array<Link> }> = [];

        Object.entries(groupedLinks).forEach((link: [string, Array<Link>]) => {
            const group = link[0];
            const links = link[1];
            groupData.push({ group: group, links: links });
        });

        // Create +/- 10 year age ranges from baseNode
        const ageRanges: string[] = [];

        for (let i = -50; i <= 50; i += 5) {
            ageRanges.push(`${i}`);
        }

        // sort group data array by percent
        groupData = _.orderBy(groupData, ['percent'], ['desc']);

        // create an array of all target ages from filteredLinks
        const targetAges = filteredLinks.map((link: Link) => {
            // calculate age of person at the given exhibiton time
            let age = link.props.data.year - link.target.props.data.birthyear;

            if (isNaN(age)) return '?';
            if (age <= 0) return '?';
            if (age > 200) return '?';

            return `${age}`;
        });


        // sort targetAges array
        targetAges.sort((a: string, b: string) => {
            if (a == '?') return 1;
            if (b == '?') return -1;
            return +a - +b;
        });

        const grouped = groupData
            .map((link: { group: string, links: Array<Link> }) => {
                link.links.forEach((l: Link) => {
                    l.props.group = link.group;

                    // set living status based on birth and death dates
                    const birthYear = +l.target.props.data.birthyear;
                    const deathYear = +l.target.props.data.deathyear;

                    if (birthYear <= 1915 && (deathYear >= 1905 || isNaN(deathYear))) {
                        l.target.props.living = 'alive';
                    } else if (deathYear < 1905 || birthYear > 1915) {
                        l.target.props.living = 'dead';
                    } else {
                        l.target.props.living = '?';
                    }

                    l.target.props.country = l.target.props.data.country;
                    l.target.props.sex = l.target.props.data.sex;

                    // calculate age of person and set to link.target.props.age
                    const age = +l.target.props.data.deathyear - +l.target.props.data.birthyear;
                    // check if age is a number and set to age or unknown
                    l.target.props.age = isNaN(age) ? 'unknown' : `${age}`;


                    // calculate difference of birthdates between target and base node
                    const diff = +l.target.props.data.birthyear - +this.state.baseNode.props.data.birthdyear;

                    const ageGroup = ageRanges.reduce((closest: string | null, age: string) => {
                        if (closest === null) return age;

                        const diffToAge = Math.abs(diff - parseInt(age));
                        const closestDiff = Math.abs(diff - parseInt(closest));
                        if (closest === null || diffToAge < closestDiff) {
                            return age;
                        }
                        return closest;
                    }, null);


                    if (!ageGroup) {
                        l.target.props.ageGroup = 'unknown';
                        return;
                    };

                    if (Math.abs(diff) > 100) {
                        l.target.props.ageGroup = 'unknown';
                    } else if (diff == 0) {
                        l.target.props.ageGroup = 'same';
                    } else if (Math.abs(diff) <= 5) {
                        l.target.props.ageGroup = 'similar';
                    } else {
                        l.target.props.ageGroup = `${+ageGroup > 0 ? 'gt_' + ageGroup : 'lt_' + Math.abs(+ageGroup)}`;
                    }
                });

                return link.links;
            });

        const sorted = groupData
            .map((group) => {
                return this.orderBy(this.state.orderBy, group.links);
            })
            .flat();

        const unique = _.uniqBy(sorted, (link: Link) => link.targetId);

        // set angleScale domain to number of unique target nodes
        this.angleScale.domain([0, unique.length]); // == index of target node

        // set nodeRScale domain to maxCount
        this.nodeRScale.domain([Math.min(...sorted.map(g => g.props.data.count)), Math.max(...sorted.map(g => g.props.data.count))]);

        // iterate over unique links and find original link in filteredLinks and set link.props.originalIndex to index of unique link
        unique.forEach((link: Link, index: number) => {
            // find filtered link with same targetId
            const filteredLink = filteredLinks.filter((l: Link) => l.targetId == link.targetId);
            if (!filteredLink) return;
            filteredLink.forEach((l: Link) => {
                l.props.originalIndex = index;
            });
        });

        return sorted;
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
            .attr('stroke', (d: Link) => this.state.colors.colors.get(d.props.group) || 'black')
            .attr('stroke-width', 2)
            .attr('fill', 'transparent');

        this.artistContainer.selectAll('circle')
            .on('mouseover', (d: PointerEvent) => {
                // get data from d 
                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as Link;

                if (!data) return;

                const x = d.clientX;
                const y = d.clientY;

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
                    .html(`
                        <p><b>${data.target.name} (${data.props.data.year - data.target.props.data.birthyear})</b></p>
                        <p>Group: ${data.props.group}</p>
                        <p>(${data.props.data.year}) ${data.props.data.count} co-exhibitions</p>
                        `);

                // set tooltip ontop of the chart
                this.tooltip.raise();

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
                this.tooltip?.remove();

                // pass year to mouseOverCallBack
                this.mouseOverCallBack(0);
                this.highlightCircle(0);

                if (this.state.selection) {
                    // reset stroke color on all circles apart from the compareNode
                    this.artistContainer?.selectAll('circle')
                        .filter((d: any) => {
                            return d.target.id !== this.state.compareNode?.id;
                        })
                        .attr('stroke', (d: any) => this.state.colors.colors.get(d.props.group) || 'black')
                        .attr('stroke-width', 2);

                    return;
                }

                this.artistContainer?.selectAll('circle')
                    .filter((d: any) => {
                        return d.target.id !== this.state.compareNode?.id;
                    })
                    .attr('opacity', 0.75)
                    .attr('stroke', (d: any) => this.state.colors.colors.get(d.props.group) || 'black')
                    .attr('stroke-width', 2)
                    .attr('fill', 'transparent');
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

                const x = d.clientX;
                const y = d.clientY;

                // get sum of all counts for links with same targetId
                const sum = this.links.filter((link: Link) => link.targetId == data.targetId)
                    .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);

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
                    .html(`
                        <p><b>${data.target.name} (${data.target.props.age})</b></p>
                        <p>Group: ${data.props.group}</p>
                        <p>${sum} co-exhibitions</p>
                        `);

                // set tooltip ontop of the chart
                this.tooltip.raise();
            })
            .on('mouseout', (d: PointerEvent) => {
                // remove rect and text from tooltip
                this.tooltip?.remove();

                // if state.selection is true return
                if (this.state.selection) return;

                // reset font weight of all labels
                this.artistContainer?.selectAll('.artist-label').attr('font-weight', 'normal');

                // unhightlight all nodes 
                this.outerCircleContainer?.selectAll('circle').attr('stroke', 'none');
                this.outerCircleContainer?.selectAll('circle').attr('stroke-width', 0);
                this.artistContainer?.selectAll('circle')
                    .attr('opacity', 0.75)
                    .attr('stroke', (d: any) => this.state.colors.colors.get(d.props.group) || 'black')
                    .attr('stroke-width', 2)
                    .attr('fill', 'transparent');

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

                    this.requestNode();
                    // return
                    return;
                }

                const id = (d.target as SVGCircleElement).id;

                const data = d3.select(`#${id}`).datum() as Link;

                console.log(data);

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
        }), (node: { targetId: number, sum: number }) => node.targetId);

        // set outerNodeRScale domain to min and max sum
        this.outerNodeRScale.domain([Math.min(...sums.map((node: { targetId: number, sum: number }) => node.sum)), Math.max(...sums.map((node: { targetId: number, sum: number }) => node.sum))]);

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
            .attr('cx', (d: Link) => {
                // (Math.cos(this.getAngle(d.props.originalIndex)) * 535) + this.state.width / 2)
                return this.getXCoordinates(this.maxYear, this.getAngle(d.props.originalIndex), 40) + this.state.width / 2;
            })
            .attr('cy', (d: Link) => {
                // (Math.sin(this.getAngle(d.props.originalIndex)) * 535) + this.state.height / 2)
                return this.getYCoordinates(this.maxYear, this.getAngle(d.props.originalIndex), 40) + this.state.height / 2;
            })
            .attr('opacity', 0.75)
            .attr('fill', (d: Link) => this.state.colors.colors.get(d.props.group) || 'black')
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

                const x = d.clientX;
                const y = d.clientY;

                // get sum of all counts for links with same targetId
                const sum = this.links.filter((link: Link) => link.targetId == data.targetId)
                    .reduce((acc: number, cur: Link) => acc + cur.props.data.count, 0);

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
                    .html(`
                        <p><b>${data.target.name} (${data.target.props.age})</b></p>
                        <p>Group: ${data.props.group}</p>
                        <p>${sum} co-exhibitions</p>
                        `);

                // set tooltip ontop of the chart
                this.tooltip.raise();
            })
            .on('mouseout', _ => {
                this.tooltip?.remove();

                // if state.selection is true return
                if (this.state.selection) return;

                // unhightlight all nodes 
                this.outerCircleContainer?.selectAll('circle').attr('stroke', 'none');
                this.outerCircleContainer?.selectAll('circle').attr('stroke-width', 0);
                this.artistContainer?.selectAll('circle')
                    .attr('opacity', 0.75)
                    .attr('stroke', (d: any) => this.state.colors.colors.get(d.props.group) || 'black')
                    .attr('stroke-width', 2)
                    .attr('fill', 'transparent');
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
                    return this.getAngle(last?.props.originalIndex) + this.theta - this.theta / 2;
                } else {
                    return this.getAngle(last?.props.originalIndex) - this.theta / 2;
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
                return this.getAngle(first?.props.originalIndex) - this.theta / 2;
            })

        this.donutContainer.selectAll('path')
            .data(_.uniqBy(this.links, (node: Link) => node.props.group))
            .join('path')
            .attr('class', 'donut')
            .attr('fill', (d: any) => this.state.colors.colors.get(d.props.group) || 'black')
            .attr('id', (d: any) => `donut-${d.props.group}`)
            .attr('stroke', 'none')
            .attr('stroke-width', 1)
            .attr('d', (d: any) => {
                return arc(d);
            })
            .style('cursor', 'pointer')
            .on('mouseover', (d: PointerEvent) => {
                // get id from mouseevent target
                const group = (d.target as SVGPathElement).id.split('-')[1];

                // calculate group percentage
                const percentage = (this.links.filter((link: Link) => link.props.group == group).length / this.links.length) * 100;

                const x = d.clientX;
                const y = d.clientY;

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
                    .text(() => {
                        if (this.state.groupBy == 'ageGroup') {
                            if (group.includes('gt')) {
                                return `~${group.split('_')[1]} years older (${percentage.toFixed(2)}%)`;
                            }
                            if (group.includes('lt')) {
                                return `~${group.split('_')[1]} years younger (${percentage.toFixed(2)}%)`;
                            }

                            return `${group} (${percentage.toFixed(2)}%)`;
                        }
                        return `${group} (${percentage.toFixed(2)}%)`;
                    });
            })
            .on('mouseout', (d: PointerEvent) => {
                // remove rect and text from tooltip
                this.tooltip?.remove();
            })
            .on('click', (d: PointerEvent) => {
                // get id from mouseevent target
                const group = (d.target as SVGPathElement).id.split('-')[1];

                if (this.selectedGroup === group) {
                    this.selectedGroup = '';
                    this.highlightGroup('');
                    if (this.props.arcClickCallback) this.props.arcClickCallback('');
                    return;
                }

                this.selectedGroup = group;
                if (this.props.arcClickCallback) this.props.arcClickCallback(group);
                this.highlightGroup(group);
            });

        // append text to donut chart
        this.donutContainer.selectAll('text')
            .data(_.uniqBy(this.links, (node: Link) => node.props.group))
            .join('text')
            .attr('class', 'donut-label')
            .attr('id', (d: any) => `donut-label-${d.props.group}`)
            // set text to d.props.group
            .text((d: any) => {
                if (this.state.groupBy == 'ageGroup') {
                    if (d.props.group.includes('gt')) {
                        return `~${d.props.group.split('_')[1]} years older`;
                    }
                    if (d.props.group.includes('lt')) {
                        return `~${d.props.group.split('_')[1]} years younger`;
                    }

                    return d.props.group;
                }

                return d.props.group;
            })
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
            })
            .style('cursor', 'pointer')
            .style('pointer-events', 'none')
            .on('mouseover', (d: PointerEvent) => {
                // get id from mouseevent target
                const group = (d.target as SVGPathElement).id.split('-')[2];

                // calculate group percentage
                const percentage = (this.links.filter((link: Link) => link.props.group == group).length / this.links.length) * 100;

                const x = d.clientX;
                const y = d.clientY;

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
                    .text(() => {
                        if (this.state.groupBy == 'ageGroup') {
                            if (group.includes('gt')) {
                                return `~${group.split('_')[1]} years older (${percentage.toFixed(2)}%)`;
                            }
                            if (group.includes('lt')) {
                                return `~${group.split('_')[1]} years younger (${percentage.toFixed(2)}%)`;
                            }

                            return `${group} (${percentage.toFixed(2)}%)`;

                        }

                        return `${group} (${percentage.toFixed(2)}%)`;
                    });
            })
            .on('mouseout', (d: PointerEvent) => {
                this.tooltip?.remove();

            })
        // .on('click', (d: PointerEvent) => {
        //     // get id from mouseevent target
        //     const group = (d.target as SVGPathElement).id.split('-')[2];

        //     if(this.selectedGroup === group) {
        //         this.selectedGroup = '';
        //         this.highlightGroup('');
        //         if(this.props.arcClickCallback) this.props.arcClickCallback('');
        //         return;
        //     }

        //     this.selectedGroup = group;
        //     if(this.props.arcClickCallback) this.props.arcClickCallback(group);
        //     this.highlightGroup(group);

        //     // raise selected text
        //     this.donutContainer?.select(`#donut-label-${group}`).raise();
        // });

        this.donutContainer.exit().remove();
    }

    getSecondaryLinks(node: Link): void {
        // Set the selected node to the node passed in 
        this.setState(prevState => ({ compareNode: node.target, loading: true }));

        const artistIdQuery = BigInt(node.target.id);

        // for each targetNode make a request to get the exhibitedWithArtists for that node
        client.query({
            query: GET_ARTIST_EXHIBITED_WITH,
            variables: {
                searchId: `${artistIdQuery}`,
            }
        }).then((res: any) => {
            // filter res.data.artists[0].exhibitedWithArtists to have only artists that are in targetNodes
            const exhibitors = res.data.artists[0].coExhibitedArtists
                .filter((artist: Artist) => {
                    // check if artist is in links array
                    const link = this.links.find((link: Link) => link.target.id == artist.id);
                    return link ? true : false;
                });

            const links = new Array<Link>();
            // convert exhibitors array to links with source = baseNode and target = exhibitor
            exhibitors.forEach((exhibitor: any) => {
                const link = {
                    sourceId: +node.target.id,
                    targetId: +exhibitor.id,
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
            this.drawSecondaryLinks(node.target.id, links);
        });
    }

    drawSecondaryLinks(id: string | number, links: Array<Link>): void {
        if (!this.state.compareNode) return;

        // Check if ID is number if not parse as number
        if (typeof id === 'string') {
            id = parseInt(id);
        }

        // set loading false
        this.setState(prevState => ({ loading: false }));

        // select all artist and outer circles and reduce the opacity to 0.25
        this.artistContainer?.selectAll('circle')
            .attr('opacity', 0.25)
            .attr('stroke', (d: any) => this.state.colors.colors.get(d.props.group) || 'black');

        this.artistContainer?.selectAll('circle')
            .filter((d: any) => d.target.id == id)
            .attr('opacity', 1)
            .attr('stroke', 'black');

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
        const baseOuter = this.outerCircleContainer?.select(`#outer-circle-${this.state.compareNode.id}`);

        if (!baseOuter) return;

        baseOuter
            .attr('opacity', 1)
            .attr('stroke', 'black')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 1);

        const baseCircle = this.artistContainer?.selectAll('circle')
            .filter((d: any) => {
                return d.target.id == this.state.compareNode?.id;
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

    highlightGroup(group: string): void {
        // select all links with the same country as the country passed in
        // change the stroke to yellow and make it dashed update stroke-width to 2
        if (!this.artistContainer) return;

        if (group === '') {
            // reset all nodes and arcs to default 
            this.artistContainer.selectAll('circle')
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .lower();

            this.outerCircleContainer?.selectAll('circle')
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .lower();

            this.donutContainer?.selectAll('path')
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .lower();

            // set labels to opacity 1
            this.artistContainer.selectAll('.artist-label')
                .attr('opacity', 1);
        } else {
            this.donutContainer?.selectAll('path')
                .attr('opacity', 0.5)
                .attr('stroke-opacity', 0.5)
                .attr('fill-opacity', 0.5);

            // set rest to opacity 0.25
            this.artistContainer.selectAll('circle')
                .attr('opacity', 0.5)
                .attr('stroke-opacity', 0.5)
                .attr('fill-opacity', 0.5);

            this.outerCircleContainer?.selectAll('circle')
                .attr('opacity', 0.5)
                .attr('stroke-opacity', 0.5)
                .attr('fill-opacity', 0.5);

            // set labels to opacity 0.25
            this.artistContainer.selectAll('.artist-label')
                .attr('opacity', 0.25);

            const prop = this.state.groupBy;

            // set labels with the same country to opacity 1
            this.artistContainer.selectAll('.artist-label')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .raise();

            // highlight all nodes and arcs with the same country
            this.artistContainer.selectAll('circle')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .raise();

            this.outerCircleContainer?.selectAll('circle')
                .filter((d: any) => d.target.props[prop] === group)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .raise();

            this.donutContainer?.select(`#donut-${group}`)
                .attr('opacity', 1)
                .attr('stroke-opacity', 1)
                .attr('fill-opacity', 1)
                .raise();
        }
    };

    highlightArtist(artist: Artist | null): void {
        // grab Link data for artist.id from outerCircleContainer
        let found = false;
        // check if artist is in ego network
        _.uniqBy(this.links, (l: Link) => l.target.id).forEach((a: Link) => {
            if (a.target.id == artist?.id) found = true;
        });

        this.artistContainer?.selectAll('.artist-label').attr('opacity', 1).attr('font-weight', 'normal');

        if (!found) {
            // deselect everything
            this.setState(prevState => ({ selection: false }));

            // reset to original stroke and color for circles and outercircles
            this.artistContainer?.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', (d: any) => this.state.colors.colors.get(d.props.group) || 'black')
                .attr('stroke-width', 2)
                .attr('fill', 'transparent');

            this.outerCircleContainer?.selectAll('circle')
                .attr('opacity', 0.75)
                .attr('stroke', 'none')
                .attr('stroke-width', 0);

            // reset opacity of labels
            this.artistContainer?.selectAll('.artist-label').attr('opacity', 1).attr('font-weight', 'normal');

            return;
        }

        if (!this.outerCircleContainer) return;

        const data = this.outerCircleContainer.select(`#outer-circle-${artist?.id}`).datum() as Link;

        this.setState(prevState => ({ selection: true }));
        this.getSecondaryLinks(data);

        // set current label font weight to bold
        const label = this.artistContainer?.select(`#artist-label-${artist?.id}`);

        if (label) label.attr('font-weight', 'bold').attr('opacity', 1);
    }

    render() {
        return (
            <>
                <div className='absolute w-auto right-5'>
                    <div className='block'>
                        <label htmlFor='co-ex'>Group by:</label>
                        <select id='group-by' value={this.state.groupBy} onChange={this.handleGroupByChange}>
                            <option value='country'>Country</option>
                            <option value='sex'>Sex</option>
                            <option value='ageGroup'>Age Group</option>
                            <option value='living'>Living</option>
                        </select>
                    </div>
                    <div className='block'>
                        <label htmlFor='co-ex'>Order by:</label>
                        <select id='order-by' value={this.state.orderBy} onChange={this.handleOrderByChange}>
                            <option value='default'>Default</option>
                            <option value='alpha'>Alphabetical</option>
                            <option value='coex'>Co-Exhibition Count</option>
                            <option value='age'>Relative Age</option>
                        </select>
                    </div>
                    <div className='block'>
                        <label htmlFor='co-ex'>Co-exhibition count: {this.state.coEx}</label>
                        <input id='co-ex' type='range' min='3' max='20' value={this.state.coEx} onChange={this.handleCoExChange} />
                    </div>
                </div>
                <svg id='ego-net' width={this.state.width} height={this.state.height}></svg>
                {/* <div id='ego-tooltip' ref={this.tooltip} className='absolute w-auto h-auto font-medium p-2 bg-black text-white'></div> */}
            </>
        )
    }
};

export default EgoNetworkComponent;