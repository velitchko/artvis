import React from 'react';
import _ from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
import { ClickEvent } from 'tsparticles-engine';
class NetworkComponent extends React.Component<{ nodes: Array<Node>, links: Array<Link>, width: number, height: number, requestNode: Function }, { nodes: Array<Node>, links: Array<Link>, width: number, height: number }> {
    private svgContainer: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined;
    private simulation: d3.Simulation<any, any> | undefined;

    constructor(props: { nodes: Array<Node>, links: Array<Link>, width: number, height: number, requestNode: Function }) {
        super(props);

        this.state = {
            nodes: props.nodes,
            links: props.links,
            width: props.width,
            height: props.height,
        };

        this.svgContainer = undefined;
    }

    componentDidMount(): void {
        this.init();
    }

    dragstarted($event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: any) {
        if (!this.simulation) return;
        if (!$event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged($event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: any) {
        d.fx = $event.x;
        d.fy = $event.y;
    }

    dragended($event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: any) {
        if (!this.simulation) return;
        if (!$event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    zoomed($event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        if (!this.svgContainer) return;
        this.svgContainer.select('#everything').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);
    }

    // request node broadcasts node id to parent
    requestNode(node: string | number) {
        // emit event to parent
        console.log('dblclick', node)
        this.props.requestNode(node);
    }


    init(): void {
        if (this.svgContainer) return;

        this.svgContainer = d3.select('#network');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.25, 10])
            .extent([[0, 0], [this.state.width, this.state.height]])
            .on('zoom', this.zoomed.bind(this));

        this.svgContainer
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('pointer-events', 'all')
            .call(zoom);

        const g = this.svgContainer
            .append('g')
            .attr('id', 'everything')
            .attr('width', this.state.width)
            .attr('height', this.state.height)

        const drag = d3.drag()
            .on('start', this.dragstarted.bind(this))
            .on('drag', this.dragged.bind(this))
            .on('end', this.dragended.bind(this));

        this.simulation = d3.forceSimulation<Node>(this.state.nodes)
            .force('link', d3.forceLink<Node, Link>(this.state.links).id((d: any) => d.id))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(this.state.width / 2, this.state.height / 2));

        const link = g.append('g')
            .attr('stroke', '#000')
            .attr('stroke-opacity', 0.6)
            .selectAll('line')
            .data(this.state.links)
            .join('line')
            .attr('stroke-width', 2);

        const node = g.append('g')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .selectAll('circle')
            .data(this.state.nodes)
            .join('circle')
            .attr('r', 10)
            .attr('id', (d: Node) => d.id)
            .attr('fill', (d: Node) => {
                // if(this.state.links.filter((link: Link) => link.source.id === d.id || link.target.id === d.id).length > 0) return '#f00';
                return '#000';
            })
            .on('dblclick', (d: React.MouseEvent<SVGCircleElement>) => {
                this.requestNode.bind(this)(d.currentTarget.id);
            })
            .call(drag.bind(this));

        const label = g.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(this.state.nodes)
            .join('text')
            .attr('fill', '#fff')
            .attr('filter', 'url(#solid)')
            .attr('class', 'label')
            .text((d: Node) => ` ${d.props.firstname} ${d.props.lastname} `)

        this.simulation.on('tick', () => {
            link
                .attr('x1', (d: Link) => {
                    return this.state.nodes.find((node: Node) => node.id === d.source.id)?.x || 0;
                })
                .attr('y1', (d: Link) => {
                    return this.state.nodes.find((node: Node) => node.id === d.source.id)?.y || 0;
                })
                .attr('x2', (d: Link) => {
                    return this.state.nodes.find((node: Node) => node.id === d.target.id)?.x || 0;
                })
                .attr('y2', (d: Link) => {
                    return this.state.nodes.find((node: Node) => node.id === d.target.id)?.y || 0;
                });

            node
                .attr('cx', (d: Node) => d.x!)
                .attr('cy', (d: Node) => d.y!);

            label
                .attr('x', (d: Node) => d.x! - ((d.props.firstname.length + d.props.lastname.length) * 8)/2)
                .attr('y', (d: Node) => d.y! - 20);
        });

        this.simulation.on('end', () => {
            console.log('simulation ended');
        });
    }

    render() {
        return (
            <>
                <svg id='network' width={this.state.width} height={this.state.height}>
                    <defs>
                        <filter x="-0.05" y="0" width="1.1" height="1.1" id="solid">
                            <feFlood floodColor="black" />
                            <feComposite in="SourceGraphic" operator="atop" />
                        </filter>
                    </defs>
                </svg>
            </>
        )
    }
};

export default NetworkComponent;