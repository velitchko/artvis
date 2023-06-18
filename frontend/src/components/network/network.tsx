import React from 'react';
import _ from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
class NetworkComponent extends React.Component<{ nodes: Array<Node>, links: Array<Link>, width: number, height: number}, { nodes: Array<Node>, links: Array<Link>, width: number, height: number }> {
    private svgContainer: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined;
    private simulation: d3.Simulation<any, any> | undefined;

    constructor(props: { nodes: Array<Node>, links: Array<Link>, width: number, height: number}) {
        super(props);

        this.state = {
            nodes: props.nodes,
            links: props.links,
            width: props.width,
            height: props.height
        };

        this.svgContainer = undefined;        
    }

    componentDidMount(): void {
        console.log(this.state.nodes);
        console.log(this.state.links);
        this.init();
    }
    dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: any) {
        if(!this.simulation) return;
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged (event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: any) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended (event: d3.D3DragEvent<SVGCircleElement, Node, unknown>, d: any) {
        if(!this.simulation) return;
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    zoomed(event: any) {
        console.log('zooming');
        if(!this.svgContainer) return;
        console.log(event.transform)
        this.svgContainer.attr("transform", event.transform);
    }
    
    
    init(): void {
        if(this.svgContainer) return;

        this.svgContainer = d3.select("#network");

        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", this.zoomed.bind(this));

        this.svgContainer
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet');

        const g = this.svgContainer
            .append('g')
            .call(zoom.bind(this));

        const drag = d3.drag()
            .on("start", this.dragstarted.bind(this))
            .on("drag", this.dragged.bind(this))
            .on("end", this.dragended.bind(this));

        this.simulation = d3.forceSimulation<Node>(this.state.nodes)
            .force("link", d3.forceLink<Node, Link>(this.state.links).id((d: any) => d.id ))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(this.state.width / 2, this.state.height / 2));

        const link = g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(this.state.links)
            .join("line")
            .attr("stroke-width", 1);

        const node = g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(this.state.nodes)
            .join("circle")
            .attr("r", 5)
            .attr("fill", (d: Node) => {
                if(this.state.links.filter((link: Link) => link.source.id === d.id || link.target.id === d.id).length > 0) return '#f00';
                return "#000";
            })
            .call(drag.bind(this));

        this.simulation.on("tick", () => {
            link
                .attr("x1", (d: Link) => d.source.x!)
                .attr("y1", (d: Link) => d.source.y!)
                .attr("x2", (d: Link) => d.target.x!)
                .attr("y2", (d: Link) => d.target.y!);

            node
                .attr("cx", (d: Node) => d.x!)
                .attr("cy", (d: Node) => d.y!);
        }
        );
    }

    render() {
        return (
            <>
                <svg id="network" width={this.state.width} height={this.state.height}></svg>
            </>
        )
    }
};

export default NetworkComponent;