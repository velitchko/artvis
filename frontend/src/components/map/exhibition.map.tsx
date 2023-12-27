import React, { Ref } from 'react';
import _, { Dictionary, min } from 'lodash';
import { Node } from '../../models/node';
import { Link } from '../../models/link';
import * as d3 from 'd3';
import client from '../apollo/client';
import GET_ARTIST_EXHIBITED_WITH from '../../queries/exhibitedWith';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import data from '../../resources/map.geo.json';

class ExhibitionMapComponent extends React.Component<{ compareWith: Artist | null, exhibitions: Array<Exhibition> | undefined, width?: number, height?: number, mouseOverCallBack?: Function }, { compareWith: Artist | null, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }> {

    private svgContainer: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined;
    private circleContainer: d3.Selection<any, any, any, any> | undefined;
    private borderContainer: d3.Selection<any, any, any, any> | undefined;

    private tooltip: d3.Selection<any, any, any, any> | undefined;
    private color: d3.ScaleOrdinal<string, string>;

    private exhibitions: Array<Exhibition> = [];

    constructor(props: { compareWith: Artist | null, exhibitions: Array<Exhibition> | undefined, width: number, height: number, coEx: number, selection: boolean }) {
        super(props);

        this.state = {
            width: props.width,
            height: props.height,
            coEx: 3,
            selection: false,
            exhibitions: props.exhibitions,
            compareWith: props.compareWith
        };

        this.svgContainer = undefined;

        this.color = d3.scaleOrdinal<string>(d3.schemeCategory10);
        this.tooltip = undefined;
    }


    init(): void {
        if (this.svgContainer) return;

        this.svgContainer = d3.select('#map');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.25, 50])
            .extent([[0, 0], [this.state.width, this.state.height]])
            .on('zoom', this.zoomed.bind(this));

        this.svgContainer
            .attr('viewBox', `0 0 ${this.state.width} ${this.state.height}`)
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .style('pointer-events', 'all')
            .call(zoom);

        const everything = this.svgContainer.append('g').attr('id', 'map-everything');

        // setup groups
        this.borderContainer = everything.append('g').attr('id', 'map-borders');
        this.circleContainer = everything.append('g').attr('id', 'map-markers');
        this.tooltip = everything.append('g').attr('id', 'map-tooltip');

        //map projection
        let projection = d3.geoMercator();

        let geoGenerator = d3.geoPath()
            .projection(projection);


        //draw map
        this.borderContainer
            .selectAll('path')
            .data(data.features)
            .join('path')
            .attr('d', (d: any) => {
                return geoGenerator(d);
            });


        this.exhibitions = this.checkExhibitions(this.state.exhibitions);


        //draw markers for exhibitions on map
        this.circleContainer
            .selectAll('map-markers')
            .data(this.exhibitions)
            .enter()
            .append("circle")
            .attr('cx', (d: Exhibition) => {

                //for undefined hosts, so they are not shown on the map
                let long = -999.0;
                let lat = -999.0;

                if (d.tookPlaceInHosts[0]) {
                    long = parseFloat(d.tookPlaceInHosts[0].longitude);
                    lat = parseFloat(d.tookPlaceInHosts[0].latitude);
                }

                return projection([long, lat])![0];
            })
            .attr('cy', (d: Exhibition) => {

                //for undefined hosts, so they are not shown on the map
                let long = -999.0;
                let lat = -999.0;

                if (d.tookPlaceInHosts[0]) {
                    long = parseFloat(d.tookPlaceInHosts[0].longitude);
                    lat = parseFloat(d.tookPlaceInHosts[0].latitude);
                }

                return projection([long, lat])![1];
            })
            .attr("r", 2)
            .style("fill", "crimson");

    }

    componentDidMount(): void {
        // get map-container element width and height and set state
        const width = document.getElementById('map-container')?.clientWidth;
        const height = document.getElementById('map-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
        // set resize handler to window
        window.addEventListener('resize', this.onResize);

        // this.init();
    }

    onResize = () => {
        // get map-container element width and height and set state
        const width = document.getElementById('map-container')?.clientWidth;
        const height = document.getElementById('map-container')?.clientHeight;

        if (!width || !height) return;

        this.setState(prevState => ({ width: width, height: height }), () => {
            this.init();
        });
    }

    zoomed($event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
        if (!this.svgContainer) return;
        this.svgContainer.select('#map-everything').attr('transform', `translate(${$event.transform.x}, ${$event.transform.y}) scale(${$event.transform.k})`);
    }


    //TODO return unique exhibitions, not 1 for each artwork
    checkExhibitions(exhibitions: Array<Exhibition> | undefined): Array<Exhibition> {

        if (exhibitions) {
            return exhibitions;
        }
        else return new Array<Exhibition>;
    }


    render() {
        return (
            <>
                <div className="float-left text-left pl-2">
                </div>
                <svg id='map' width={this.state.width} height={this.state.height}></svg>
            </>
        )
    }
};

export default ExhibitionMapComponent;